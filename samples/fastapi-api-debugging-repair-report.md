# FastAPI/API Debugging and Repair Report — Synthetic Demonstration

> **Synthetic demonstration — not client work.** Rookery Cloud Console is a fictional SaaS backend. All companies, users, routes, payloads, logs, identifiers and test results below are invented to demonstrate a realistic API-repair handoff.

## Report boundary

| Field | Synthetic value |
| --- | --- |
| Application | Rookery Cloud Console (fictional) |
| Stack | FastAPI, Pydantic, SQLAlchemy async session, PostgreSQL, JWT |
| Endpoint | `POST /v1/projects/{project_id}/members` |
| Repair boundary | Authorization, request validation, transactional write and error mapping for one endpoint |
| Environment | Authorized synthetic integration-test database |

This report is not a customer case study or production result. A real repair would require authorized logs, repository access and a controlled test environment.

## Executive summary

The fictional member-invite endpoint returned `500 Internal Server Error` for malformed roles, mixed-case duplicate emails and expired tokens. It could also leave a membership row committed when the associated audit write failed.

Four implementation defects shared one endpoint boundary: request validation accepted unsupported roles; a broad `except Exception` converted intentional authentication errors into 500s; the duplicate check ran outside the write transaction; and membership plus audit records were committed separately.

The synthetic repair validates the request before business logic, preserves correct authentication and authorization responses, normalizes the invite identity, writes membership and audit records in one transaction, relies on a database uniqueness constraint for race safety, and maps known integrity conflicts to `409 Conflict`. Unit and integration checks cover success, invalid input, permission denial, duplicate requests, concurrent duplicates and forced audit failure.

## Failing endpoint

```http
POST /v1/projects/prj_demo_18/members
Authorization: Bearer <redacted synthetic token>
Content-Type: application/json

{
  "email": "Avery@example.test",
  "role": "owner-admin"
}
```

Observed synthetic response before repair:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{
  "detail": "Unable to invite member"
}
```

Expected response for an unsupported role:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "detail": [
    {
      "loc": ["body", "role"],
      "msg": "Input should be 'viewer' or 'editor'",
      "type": "literal_error"
    }
  ]
}
```

The examples use reserved `.test` addresses and fictional identifiers.

## Failure symptoms

- A valid project owner can invite a new email once, but a second request using different letter case returns 500 instead of an idempotent conflict response.
- Unsupported roles reach the database `CHECK` constraint and surface as 500.
- An expired JWT produces 500 because the endpoint catches the authentication dependency's intentional HTTP exception.
- A forced audit-table failure occurs after the membership row has already been committed.
- Logs contain a raw database exception but no stable request/correlation ID.
- Two concurrent requests can both pass the application-level `SELECT` before one loses at the unique constraint.

## Reproduction

1. Seed fictional project `prj_demo_18` and owner `usr_demo_7` in the integration database.
2. Send a valid invite for `avery@example.test`; observe `201 Created`.
3. Send `Avery@example.test`; observe a database uniqueness exception and generic 500.
4. Send role `owner-admin`; observe a `CHECK` constraint exception and generic 500.
5. Send a valid body with an expired token; observe generic 500 rather than 401.
6. Configure the synthetic audit repository to fail after the membership insert.
7. Send a valid new invite and observe that the membership exists even though the response is 500.
8. Send two concurrent valid requests for one new normalized email and observe one 201 plus one generic 500.

Synthetic log excerpt before repair:

```text
ERROR invite_member IntegrityError duplicate key value violates unique constraint
ERROR invite_member HTTPException: token expired
ERROR invite_member audit insert failed after membership commit
```

## Authentication and authorization issue

Authentication is implemented as a dependency that correctly raises `401` for an absent, invalid or expired JWT. The endpoint wrapped its entire body in `except Exception`, so it intercepted that deliberate response and emitted a generic 500.

The endpoint also checked only for project membership, not the required `owner` permission. An editor therefore reached the write path before a later database policy rejected the insert.

Repair contract:

- token missing, invalid or expired → `401` with no write attempt;
- authenticated non-member → `404` to avoid confirming project existence;
- authenticated member without invite permission → `403`;
- authorized owner → validation and transactional write path.

## Validation issue

The request model used unconstrained strings:

```python
class InviteMemberRequest(BaseModel):
    email: str
    role: str
```

That allowed blank or malformed email values and unsupported roles to reach repository code. The repaired boundary uses an email validator and a closed role set, then normalizes the email for identity comparison while preserving a display form separately.

Illustrative synthetic model:

```python
class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: Literal["viewer", "editor"]
```

The exact validation library and normalization rules must match the real application's contract; email normalization should not silently rewrite addresses beyond the agreed identity rule.

## Database and transaction failure

Before repair, the code performed:

1. application-level duplicate `SELECT`;
2. membership insert;
3. membership commit;
4. audit insert;
5. audit commit.

This sequence had two defects:

- the pre-check could not prevent a concurrent duplicate;
- an audit failure after step 3 left a membership with no matching audit record.

The synthetic repair performs authorization first, then starts one database transaction. Membership and audit records are added and flushed inside that transaction. A unique constraint on `(project_id, normalized_email)` remains the final concurrency boundary. A known conflict is mapped after rollback to `409 Conflict`; unknown integrity failures remain internal errors and are logged with a correlation ID.

## Error-handling problem

The original generic handler hid useful client errors and exposed no stable diagnostic reference. The repaired behavior follows three rules:

1. Let framework validation and deliberate `HTTPException` responses keep their status and safe message.
2. Catch only exceptions the endpoint can translate correctly, such as the named invite-identity unique constraint.
3. Log unexpected failures with a generated correlation ID, return a non-sensitive 500 response, and preserve the original exception for monitoring.

Raw SQL, JWTs, headers, connection strings and request secrets are never included in client responses.

## Root cause

| Failure | Root cause | Repair |
| --- | --- | --- |
| Unsupported role returns 500 | Request schema accepts any string | Closed role type; reject at 422 boundary |
| Expired token returns 500 | Broad handler catches deliberate auth exception | Preserve dependency response; narrow handlers |
| Editor reaches write path | Authorization checks membership, not permission | Explicit owner/permission dependency before transaction |
| Mixed-case duplicate returns 500 | Identity normalization is inconsistent | One normalized identity field and named unique constraint |
| Concurrent duplicate returns 500 | Application pre-check is race-prone | Database uniqueness remains authoritative; map to 409 |
| Audit failure leaves partial state | Two commits for one business action | One transaction for membership and audit |
| Generic failure cannot be traced | No correlation ID | Safe response plus structured server-side reference |

## Repair approach

1. Define a validated request DTO with an email type and allowed role values.
2. Resolve authentication and project invite permission before opening the write transaction.
3. Normalize the identity once using the documented rule.
4. Execute membership and audit writes inside one `session.begin()` boundary.
5. Flush inside the transaction so integrity failures occur before success is returned.
6. Identify the named uniqueness conflict and return `409` with a safe, stable error code.
7. Preserve `401`, `403`, `404` and `422` behavior.
8. Attach a correlation ID to unexpected `500` responses and structured logs.
9. Add unit tests around validation/error translation and integration tests against a real PostgreSQL test transaction.

Illustrative synthetic service shape:

```python
async with session.begin():
    membership = ProjectMember(
        project_id=project_id,
        normalized_email=normalize_invite_email(payload.email),
        role=payload.role,
    )
    session.add(membership)
    session.add(AuditEvent.for_member_invite(actor, membership))
    await session.flush()
```

This excerpt is invented and omits application-specific details.

## Before and after behavior

| Condition | Before | After |
| --- | --- | --- |
| Valid owner invite | `201`, separate commits | `201`, membership and audit commit atomically |
| Invalid email or role | Database error → `500` | Request validation → `422` |
| Expired token | Caught and converted to `500` | `401`; no database write |
| Editor invite attempt | Reaches repository / later failure | `403`; no transaction opened |
| Existing normalized email | Generic integrity `500` | `409 member_already_invited` |
| Concurrent duplicate | One `201`, one generic `500` | One `201`, one `409`; one membership |
| Audit insert failure | Partial membership remains | Transaction rolls back both writes; safe `500` reference |
| Unexpected database fault | Generic message without trace | Safe `500` plus correlation ID in logs |

## Unit and integration tests

| ID | Level | Setup | Expected | Synthetic result |
| --- | --- | --- | --- | --- |
| API-01 | Unit | Unsupported role | Model rejects request before service call | Pass |
| API-02 | Unit | Expired JWT dependency | `401`; service not invoked | Pass |
| API-03 | Unit | Editor identity | `403`; repository not invoked | Pass |
| API-04 | Integration | Authorized new invite | `201`; one membership and one audit row | Pass |
| API-05 | Integration | Same email with different case | `409`; row counts unchanged | Pass |
| API-06 | Integration | Two concurrent identical invites | One `201`, one `409`, one membership | Pass |
| API-07 | Integration | Audit insert forced to fail | `500` reference; zero new membership/audit rows | Pass |
| API-08 | Integration | Unknown project | `404`; no project existence detail leaked | Pass |

All observations are synthetic and demonstrate how evidence would be recorded.

## Failure-path test detail

The highest-risk data-integrity check forces the audit insert to fail after the membership object has been flushed but before the transaction exits.

Expected assertions:

- response is a safe `500` containing only `error_code` and `correlation_id`;
- transaction is rolled back;
- membership count for the target normalized email remains zero;
- audit count for the request remains zero;
- structured server log contains the correlation ID and exception class;
- log does not contain the bearer token, database URL or complete request headers;
- retrying after the dependency recovers can succeed once.

Synthetic observation: all assertions pass.

## Remaining risks

- Email identity rules vary; case folding may not match every provider or product policy.
- Sending an external invitation email inside the database transaction would create an unsafe dual-write. A real system should use an outbox or another idempotent post-commit mechanism.
- A `409` response can still disclose existing membership if authorization is too broad; the permission boundary must remain first.
- Database constraint names differ by migration and environment; error mapping must be tested against the deployed schema.
- Rate limiting, abuse prevention, invitation expiry and bulk invites are outside this endpoint repair.
- Load, failover, production deployment and historical data cleanup are not included in the synthetic milestone.

## Handoff checklist

- Endpoint, accepted roles and response contract are documented.
- Authentication and authorization order is recorded.
- Normalized identity rule and database constraint are recorded.
- Membership and audit writes share one transaction.
- Known conflicts map to `409`; invalid bodies map to `422`.
- Unexpected errors return a safe correlation reference.
- Success, duplicate, concurrent duplicate and forced-rollback tests pass.
- Logs were reviewed for token, header and connection-string leakage.
- Migration compatibility was checked in the authorized test environment.
- Production release and rollback remain owner-approved actions.
- Invitation delivery, bulk operations and unrelated endpoints remain out of scope.

## Synthetic conclusion

The fictional endpoint now returns truthful status codes, enforces permission before write, and preserves membership/audit atomicity across the tested paths. This sample demonstrates a repair report; it does not claim a real customer, deployment, certification or commercial result.
