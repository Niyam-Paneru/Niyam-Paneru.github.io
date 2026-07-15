# Web App Launch-Blocker Repair Report — Synthetic Demonstration

> **Synthetic demonstration — not client work.** Harbor Finch Workspace is a fictional SaaS application. All names, routes, logs, commits, timings and results below are invented to demonstrate a technically realistic repair handoff.

## Report boundary

| Field | Synthetic value |
| --- | --- |
| Application | Harbor Finch Workspace (fictional) |
| Stack | Next.js App Router, React, TypeScript, PostgreSQL-backed REST API |
| Blocker | Workspace billing settings fail on direct load and production build |
| Repair boundary | One route, its data-loading path and nearby regression checks |
| Environment | Authorized synthetic preview environment |

This report does not imply a customer engagement, production deployment or business result. A real repair would require reproduction in the buyer's authorized repository and environment.

## Executive summary

The fictional `/workspaces/[workspaceId]/billing` page worked when reached from an already-loaded dashboard but failed on a direct link, browser refresh and production prerender. The migrated App Router page still depended on the legacy Pages Router and a transient client store for `workspaceId`. Client navigation happened to populate that store; a clean load did not.

The repair makes the URL parameter the source of truth. A server page validates `params.workspaceId`, loads the workspace for the authenticated user and passes explicit initial data to the interactive billing form. The client no longer constructs an API request with an undefined identifier. Loading, not-found, unauthenticated and API-failure states are rendered deliberately.

The synthetic regression suite passes direct links, in-app navigation, refresh, invalid workspace, expired-session, empty-state, mobile-layout and production-preview checks. Remaining risks are recorded below.

## Visible symptom

- A signed-in user clicks **Billing settings** from the dashboard and usually sees the page.
- Pasting the same URL into a new tab shows a blank content panel and permanent loading indicator.
- Refreshing the route produces the same failure.
- The preview deployment cannot complete its production build after the route migration.
- At a 390 px viewport, the error fallback pushes the primary action outside the visible card.

## Reproduction steps

1. Start from a clean browser profile with no workspace state in local storage.
2. Sign in as synthetic user `owner_demo_42`.
3. Open `/workspaces/ws_demo_17/billing` directly.
4. Observe a request to `/api/workspaces/undefined/billing-summary` and a permanent loading state.
5. Open the dashboard first, choose workspace `ws_demo_17`, then navigate to Billing settings.
6. Observe that the page loads because the dashboard populated the client store.
7. Run a clean production build with the synthetic environment-variable names configured.
8. Observe the prerender failure for the billing route.

## Browser and build evidence

Synthetic browser console excerpt:

```text
GET /api/workspaces/undefined/billing-summary 404
TypeError: Cannot read properties of null (reading 'plan')
    at BillingSummaryCard
```

Synthetic production-build excerpt:

```text
Error: NextRouter was not mounted
Error occurred prerendering page "/workspaces/[workspaceId]/billing"
Export encountered an error on /workspaces/[workspaceId]/billing
```

Network evidence:

| Navigation path | Summary request | Result |
| --- | --- | --- |
| Dashboard → billing | `/api/workspaces/ws_demo_17/billing-summary` | `200` |
| Direct link | `/api/workspaces/undefined/billing-summary` | `404` |
| Browser refresh | `/api/workspaces/undefined/billing-summary` | `404` |

## Root cause

The route was migrated into the App Router, but three assumptions from the old implementation remained:

1. **Wrong router contract.** The client imported `useRouter` from `next/router` and expected `router.query.workspaceId`. That API belongs to the Pages Router and is not a reliable parameter source in an App Router page.
2. **Transient state as identity.** The route preferred `activeWorkspace.id` from a client store. The dashboard populated it during client navigation, masking the defect. A direct load began with `activeWorkspace=null`.
3. **Unsafe render path.** The component rendered `summary.plan` before the fetch state had produced a non-null summary. A failed request therefore became a render exception rather than a useful error state.
4. **Missing responsive fallback.** The generic error panel used a fixed minimum width wider than a 390 px viewport.

The API and database were healthy for valid workspace IDs. Changing them would have widened the repair without addressing the route defect.

## Code-level repair approach

The synthetic patch is intentionally bounded to the route and its direct data dependency:

1. Make `app/workspaces/[workspaceId]/billing/page.tsx` a server component that receives `params`.
2. Validate the parameter before calling the API client. Reject empty or malformed identifiers with the route's not-found behavior.
3. Resolve the authenticated user on the server and request the billing summary with the validated ID.
4. Map `401`, `403`, `404` and dependency failures to explicit page states; do not turn every response into a spinner.
5. Pass `workspaceId` and `initialSummary` into a small client component for interactive form controls.
6. Key client revalidation by the explicit `workspaceId`; remove the active-workspace store from request construction.
7. Render loading, error and empty states before dereferencing `summary`.
8. Replace the fallback's fixed width with fluid sizing and wrapping actions.

Illustrative synthetic repair shape:

```tsx
export default async function BillingPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  assertWorkspaceId(workspaceId);

  const session = await requireSession();
  const summary = await getBillingSummary(session, workspaceId);

  return (
    <BillingSettings
      workspaceId={workspaceId}
      initialSummary={summary}
    />
  );
}
```

This excerpt is invented for the sample. It is not copied from a private repository.

## Before and after behavior

| Condition | Before | After |
| --- | --- | --- |
| Direct authenticated load | Requests `undefined`; spinner never resolves | Validated route ID; summary renders |
| In-app navigation | Usually works because client store is warm | Works without relying on store history |
| Browser refresh | Blank panel / render exception | Same result as direct load |
| Unknown workspace | Generic loading state | Deliberate not-found state |
| Expired session | Generic error or spinner | Sign-in route with safe return URL |
| API unavailable | Null dereference | Bounded retry action and correlation reference |
| Production build | Prerender fails | Clean build completes |
| 390 px viewport | Action overflows error card | Wrapped, fully visible action |

## Regression checks

| ID | Check | Expected | Synthetic observation | Result |
| --- | --- | --- | --- | --- |
| WEB-01 | Direct URL with authorized workspace | Billing summary and form render | `200`; correct workspace name and plan | Pass |
| WEB-02 | Dashboard navigation | Same output as direct load | No request uses client-store identity | Pass |
| WEB-03 | Refresh after edit | Persisted values reload | One summary request; saved value shown | Pass |
| WEB-04 | Unknown workspace | No data leak; clear not-found state | `404` page; no summary fields rendered | Pass |
| WEB-05 | User lacks workspace access | No data leak; access denied | `403` state; no client retry loop | Pass |
| WEB-06 | Expired session | Reauthenticate safely | Sign-in redirect contains relative return path | Pass |
| WEB-07 | Summary API returns `503` | Useful failure state; no crash | Correlation reference and retry control shown | Pass |
| WEB-08 | Empty billing history | Valid empty state | No null dereference; setup action visible | Pass |

Synthetic checks describe the expected deliverable format, not measurements from a real client system.

## Mobile check

Tested synthetically at a 390 × 844 CSS-pixel viewport:

- no horizontal page overflow;
- heading, plan value and primary action remain readable without zoom;
- error text wraps within the card;
- actions wrap vertically with at least a 44 px touch target;
- keyboard focus remains visible;
- the billing table uses its intentional horizontal scroll container rather than widening the page.

## Deployment check

The synthetic closeout uses the same production build command and runtime family as the preview target:

1. clean dependency install from the lockfile;
2. required environment-variable **names** checked without printing values;
3. lint and type checks pass;
4. production build completes;
5. preview deployment becomes healthy;
6. direct interior URL returns the application rather than a platform 404;
7. browser refresh on the interior URL succeeds;
8. no new console errors or failed summary requests appear;
9. rollback commit and owner approval are recorded before production release.

Synthetic outcome: all preview checks pass. Production release is not claimed and would remain the buyer's approval decision.

## Remaining risks

- Other migrated workspace routes may still depend on the transient active-workspace store; they were not included in this milestone.
- Authorization behavior depends on the backend continuing to enforce workspace membership, not only the page state.
- Cached billing data needs an environment-specific freshness policy.
- A provider-side outage can still make billing information temporarily unavailable.
- The sample does not include payment-provider writes, data migration, load testing or production release.
- Framework upgrades can change routing and caching behavior; lockfile and build checks should run on future upgrades.

## Handoff notes

- Repair boundary and acceptance criteria are recorded in the pull request.
- Direct load, client navigation and refresh now use the route parameter as the identity source.
- Tested response states: `200`, `401`, `403`, `404` and `503`.
- No secret values appear in logs, screenshots or handoff notes.
- Mobile and keyboard checks are recorded.
- Preview build and direct-route verification are recorded.
- Production deployment still requires the owner's explicit approval and rollback check.
- Unrelated routes and feature requests remain outside the repair.

## Synthetic conclusion

The fictional launch blocker is repaired within the stated route boundary, and the listed preview checks pass. This document demonstrates an evidence format; it does not claim a real customer, deployment, revenue result or conversion improvement.
