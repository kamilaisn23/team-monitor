# Sync scheduler and source health

The Docker web entry point supervises the standalone web server and a scheduler process in the same Railway service. Both use the existing database and integration variables; no extra service or volume is created. A child failure stops the deployment so Railway's restart policy restarts both processes. SIGTERM stops both children.

The scheduler checks due occurrences every 30 seconds. GitHub/GitLab default to 02:00 WIB daily; Kerjabaik defaults to hourly. `SYNC_CRON_SCHEDULE` and `KERJABAIK_SYNC_CRON_SCHEDULE` use **Asia/Jakarta**, including custom expressions (the earlier script treated them as UTC). Set `SYNC_SCHEDULER_ENABLED=false` to pause automatic sync. Manual sync is still available to admins.

A source is enabled only when its required variables are present:

| Source | Required configuration |
| --- | --- |
| GitHub | `GITHUB_TOKEN` or `GITHUB_ORG_TOKEN`, and `GITHUB_USER_NAME` or `GITHUB_ORG_NAME` |
| GitLab | `GITLAB_BASE_URL`, `GITLAB_GROUP_TOKEN`, `GITLAB_GROUP_ID` |
| Kerjabaik | `KERJABAIK_BASE_URL`, `KERJABAIK_SERVICE_TOKEN` |

Presence enables scheduling; successful sync verifies actual access. Invalid credentials produce failed source health, never a success timestamp. Missing sources are skipped, without requests. The initial check may catch up the most recent missed occurrence; historical occurrences are not replayed. Add new variable names with `preserve()` in `.railway/railway.ts` before applying IaC.

All entry points acquire the same PostgreSQL **session advisory lock** on a dedicated `pg` connection before creating a job. The lock covers worker exit and final job persistence. A five-minute database-backed cooldown applies to all completed attempts, including failures. Scheduled sources wait through busy/cooldown periods. Persistent occurrence claims (`sync:schedule:<source>`) prevent duplicate scheduling across replicas/restarts. Do not use a transaction-mode pooler for this connection. [PostgreSQL lock semantics](https://www.postgresql.org/docs/17/explicit-locking.html#ADVISORY-LOCKS).

A disconnected lock owner terminates its worker. PostgreSQL releases locks on session end/process death. A new owner marks abandoned jobs as interrupted; merely importing the manager never changes jobs. Read-only status checks can report an interrupted job without invalidating an active owner. Terminal job results are persisted, and SSE connections to another process poll the final result. Progress events are local to the worker's process; cross-process subscribers receive waiting and final status.

Source health uses internal `sync:health:<source>` records in Settings, with source/job/trigger/start/finish/counts/error-count. No credentials or upstream response bodies are persisted. Admin settings show the last result and the next planned occurrence in WIB. Next time is a planned cron occurrence: lock/cooldown can delay actual execution. Public preview uses fictional health data and makes no private calls.

Verification commands:

```powershell
npm run typecheck
npm test
npm run build
npm run test:sync-db
```

`test:sync-db` requires a local/disposable PostgreSQL URL. It checks separate-process contention and owner death using only locks, without changing application records. Production integration execution remains disabled until variables are configured. Railway startup logs must include `[scheduler] Running in Asia/Jakarta`; authenticated `/api/sync/health` and Settings are admin-only.
