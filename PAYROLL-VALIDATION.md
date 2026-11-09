# Payroll migration local validation

**Result: PASS** for the focused checks below, run on 2026-11-09.

Environment: PostgreSQL 17.11 in a disposable Docker container with networking
disabled. Both repository migrations were applied unchanged using minimal local
`auth.users`, `auth.uid()`, `anon`, and `authenticated` fixtures. The container
was removed after the test. No live Supabase project was contacted.

Payroll migration SHA-256:
`3bfa491f69fa4867057da78337c41b6c660f5ba5117c53a271776669e7a0c442`.

| Check | Result | Observed |
| --- | --- | --- |
| Migration application | PASS | Both migrations applied successfully. |
| RLS and authorization | PASS | Owner saw all five attendance rows; staff saw three own attendance rows and one own payment. Cross-staff summary, direct staff payment insert, staff payment RPC, and anonymous table and summary access were denied. Inactive staff saw no attendance rows. |
| Salary | PASS | One minute earned INR 0.83, two minutes earned INR 1.67, and 90 minutes earned INR 75.00. |
| Overlapping shifts | PASS | Overlap was rejected with `exclusion_violation`; adjacent shifts were accepted. |
| Payment idempotency | PASS | Repeating the same INR 25 payment returned the same ID and left one payment and INR 50 pending; a changed payload was rejected. |
| Concurrent overpayment | PASS | Two sessions attempted INR 70 each against INR 100 earned. The second session was observed waiting on a lock; after the first committed, the second failed with `Payment exceeds pending salary`. Final ledger: one payment, INR 70 paid, INR 30 pending. |

This focused local test used mocked Supabase auth and did not verify every policy,
schedule, edge case, or the live Supabase schema and configuration. Staging
validation remains necessary before live deployment.
