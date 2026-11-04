# Database migrations, backup and recovery

This project pins Prisma 5.22. Production startup runs `prisma migrate deploy` before web/scheduler start. Never run `migrate reset` or `db push --accept-data-loss` on a shared/live database.

## Migration history

`0_init` recreates the schema before the three existing incremental migrations. The old migrations and their names are preserved. An empty database can therefore apply the complete chain, including Kerjabaik IDs and ADMIN role. Migration SQL is committed with LF endings.

For an existing database that was initialized using `db push`, adoption is a **one-time administrative action**, not automatic startup behavior. Take and verify a backup first. `scripts/baseline-existing.mjs` compares the existing database against the current schema and refuses drift before touching migration metadata. It rejects unexpected/unresolved migration history. It then records the four known migrations as already applied without running their DDL or changing application rows. It never assumes an arbitrary existing schema is compatible.

```powershell
# DATABASE_URL must point at the intended existing database; keep it out of shell history.
# Set this only after a backup has been restored and checked independently.
$env:BASELINE_BACKUP_VERIFIED = 'true'
node scripts/baseline-existing.mjs
npx prisma migrate status
npx prisma migrate deploy
```

For an empty installation, skip baseline adoption and run `npx prisma migrate deploy`. For future schema changes, generate a new migration in development, inspect SQL, test it on a populated copy, and ship the migration with the application. Do not edit previously applied SQL. The adoption helper is only for the original four migrations, not for later feature migrations. [Prisma baselining workflow](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining) describes the concept; commands here use the pinned Prisma 5 CLI.

## Backup

Use a `pg_dump` version at least as new as the server (Railway currently runs PostgreSQL 18). Run through an authenticated private connection or SSH on Postgres. Supply credentials through process environment, not command arguments, logs, Git or chat.

```sh
umask 077
export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --format=custom --no-owner --no-acl --file=/secure-backups/team-monitor.dump
sha256sum /secure-backups/team-monitor.dump
```

Store a copy outside the container and repository, with access restricted to the operator, encrypted storage and an appropriate retention policy. Record project/environment, time, byte size, checksum and schema/migration version. Container `/tmp` is temporary, not a backup destination. Do not commit a dump or its rows. Protect backups as production data.

## Restore and verification

Restore into a **new, isolated database** first. Use no `--clean` against production. Confirm the target name and host before creating it.

```sh
createdb -h localhost -U "$POSTGRES_USER" team_monitor_restore_check
pg_restore -h localhost -U "$POSTGRES_USER" -d team_monitor_restore_check \
  --exit-on-error --single-transaction --no-owner --no-acl /secure-backups/team-monitor.dump
```

Verify the transferred checksum, tables, constraints, row counts, representative relationships and migration history. Then run the application against the restored copy and check scoped dashboard/reports/attention data. Run the intended migration against this copy before changing production. `npm run test:migrations` performs empty installation, adoption on a populated clone, full application-row hash comparison, repeat deployment and drift rejection on temporary local databases. `npm run test:sync-db` separately verifies lock behavior.

## Rollback

For a failed application release, redeploy the previous healthy application when its code is compatible with the applied schema. Prisma Migrate does not automatically reverse committed DDL. Prefer an additive corrective migration, test it on a restored copy, and deploy it normally. A failed migration must be investigated before `migrate resolve`; never mark failed DDL as applied blindly.

If recovery requires restoring a backup, stop the scheduler and application writes, retain the current database for investigation, and restore into a new database. Review restored integrity and application behavior before changing `DATABASE_URL` to that database and redeploying. This switch can discard writes newer than the backup; require the operator's explicit recovery decision. Do not overwrite/drop production as part of a routine rollback or test. Remove only explicitly named scratch databases once tests pass.

## Verified baseline exercise — 14 October 2026

- Production backup was transferred out of the container with matching SHA-256, and restored into a separate PostgreSQL 18 database.
- The complete migration SQL chain created an empty PostgreSQL 18 database successfully.
- Local automated checks cover a populated clone and reject schema drift without writing metadata.
- Backup files stay under the operator's local `TeamMonitor/backups` directory, outside Git. Temporary SSH access is revoked after the exercise.
