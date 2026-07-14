# AI Workflow Reliability Report — Synthetic Demonstration

> **Synthetic demonstration.** Copper Finch Software, its systems, event IDs, timings and evidence are fictional. This sample shows the form of a reliability-sprint handoff; it is not client work or a production result.

## Executive summary

The fictional billing provider retried subscription events whenever the workflow did not acknowledge within ten seconds. The original n8n flow waited for CRM and notification branches before responding, had no durable idempotency record, and retried permanent validation errors. A transient CRM timeout therefore produced both delayed acknowledgements and duplicate contacts.

The synthetic patch separates receipt from processing: validate and persist the event once, return `202 Accepted`, then process durable per-destination work. A unique provider event ID prevents duplicate business effects; bounded retry with jitter handles transient faults; permanent failures enter a review queue with an alert.

## Workflow description

Fictional subscription activation flow:

1. A billing provider posts a signed `subscription.activated` webhook.
2. The receiver verifies the unmodified request, claims the provider event ID and persists the required data.
3. A worker maps stable account and plan fields.
4. Durable destination tasks upsert the CRM account, send one onboarding notification and record operations state.

## Failure symptoms

- Two CRM contacts and two onboarding messages for one subscription activation.
- Some valid subscriptions missing from the CRM after a temporary outage.
- Provider logs showing several deliveries of the same event ID.
- n8n executions marked failed when only the CRM branch failed.
- No consolidated pending, retry, complete or review state.

## Reproduction steps

1. Send a valid signed synthetic event with ID `evt_demo_1042`.
2. Configure the CRM stub to delay twelve seconds on its first request, beyond the provider acknowledgement window.
3. Observe that the original flow withholds its response and the provider repeats the same event.
4. Restore the CRM stub and allow both executions to finish.
5. Observe two create requests and two notification requests for one provider event.

Synthetic evidence: `09:14:07 delivery 1 timed out; 09:14:19 delivery 2 accepted; CRM create calls for external_account=acct_demo_77: 2`.

## Root cause

1. No durable idempotency claim before downstream calls.
2. Webhook acknowledgement depended on all downstream work.
3. The CRM used create instead of an upsert against a stable external key.
4. Timeouts, 429/5xx responses and permanent 400 errors shared a generic retry path.
5. Per-event and per-destination state was not observable.

## Before / after behavior

| Condition | Before | After |
| --- | --- | --- |
| Valid first delivery | Wait for integrations, then acknowledge | Verify, claim, persist and return 202; process asynchronously |
| Duplicate event ID | Start another full execution | Return recorded acceptance without repeating business effects |
| Timeout / 429 / 5xx | Fail the whole workflow | Retry only the failed destination with backoff and jitter |
| 400 validation error | Enter generic retry | Mark permanent failure, preserve evidence and alert |
| Retry exhaustion | Remain buried in execution history | Move to review state and send one deduplicated alert |

## Five test cases

| ID | Purpose and setup | Expected | Synthetic evidence | Result |
| --- | --- | --- | --- | --- |
| WF-01 | Happy path; all stubs return 2xx | 202 under 500 ms; each destination once; complete | `ack=84ms; crm=1; notify=1; state=complete` | Pass |
| WF-02 | Duplicate/idempotency; same event five times concurrently | One event and one execution per destination | `responses=5x202; rows=1; crm=1; notify=1` | Pass |
| WF-03 | Downstream failure; CRM returns 400 | No blind retry; CRM review state; alert | `attempts=1; state=review; alert=al_demo_31` | Pass |
| WF-04 | Retry; CRM returns 503 twice then 200 | Bounded retry of CRM only; no duplicate notification | `attempts=3 at 0/31/94s; notify=1; complete` | Pass |
| WF-05 | Alert/recovery; 503 through limit then authorized requeue | One alert; preserved reference; safe requeue completes | `alerts=1; requeue_actor=ops_demo; complete` | Pass |

All identifiers and timings are synthetic demonstration data.

## Patch outline

- Verify signature against the unmodified request body.
- Use a unique constraint on provider plus provider event ID.
- Persist only needed fields and a payload hash.
- Track independent destination state, attempts and next-attempt time.
- Retry timeouts, 429 and selected 5xx responses with exponential backoff and jitter; honor `Retry-After`.
- Do not retry authentication, permission or schema errors without an explicit rule.
- Upsert the CRM record by stable external account ID.
- Deduplicate alerts by destination task and failure cycle.

## Remaining risks

- Incorrect provider reuse of an event ID can be detected, not resolved.
- A downstream API can accept a request but time out before responding; it needs its own idempotency protection or safe lookup.
- Out-of-order events require a version or occurred-at rule.
- Retention, redaction, queue capacity, rate limits and recovery objectives remain environment-specific.
- Provider schema and authentication changes require monitoring and contract tests.

## Handoff checklist

- [ ] Acceptance criteria and tested event types recorded
- [ ] Synthetic test payloads only
- [ ] Secrets kept out of workflow exports
- [ ] Idempotency and retention behavior documented
- [ ] Retryable and permanent status classes listed
- [ ] Attempt limit, backoff and alert threshold recorded
- [ ] Review and authorized requeue demonstrated
- [ ] Rollback or workflow-disable procedure recorded
- [ ] Pending/review/oldest-event queries available
- [ ] Known risks assigned to owners

> **Synthetic demonstration conclusion:** The fictional acceptance tests pass. Production readiness would still require environment-specific load, security, data, monitoring and recovery review.
