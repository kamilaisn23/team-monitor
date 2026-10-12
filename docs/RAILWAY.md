# Railway deployment

The `team-monitor` project deploys a committed snapshot of `kamilaisn23/team-monitor` branch `main` to the `web` service, with a separate Railway PostgreSQL service. Deployment currently uses Railway CLI upload because Railway's GitHub integration does not have access to the repository. Grant repository access to that integration before enabling GitHub autodeploys.

The existing Dockerfile builds the Next.js standalone server and sync-worker bundles. The app binds to `0.0.0.0` using `PORT=3000`. `railway.json` checks `/preview` before marking the deployment healthy.

Set `DATABASE_URL` to the Railway reference `${{Postgres.DATABASE_URL}}`, provide a generated `AUTH_SECRET`, set `AUTH_TRUST_HOST=true`, and set `AUTH_URL` and `NEXTAUTH_URL` to the public service URL. Secret values belong in Railway variables, never in source control.

The container's existing startup command uses `prisma db push --skip-generate` to initialize the schema before starting the standalone server. The current migration history does not contain an initial schema migration; do not replace this with `prisma migrate deploy` on an empty database until the migration history has a baseline. Schema synchronization runs without accepting data loss.

The public design preview uses fictional data and does not require OAuth. For real sign-in, configure `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from a GitHub OAuth App and set its callback URL to `<service-url>/api/auth/callback/github`. Use `SUPERADMIN_GITHUB_USERNAME` for the administrator account. Configure GitHub/GitLab/Kerjabaik integration variables before syncing actual records.

Useful commands after linking the project:

```powershell
railway service status --service web --environment production
railway logs --service web --environment production --lines 100
railway up --service web --environment production --detach
```
