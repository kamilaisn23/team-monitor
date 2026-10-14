# Railway deployment

The `team-monitor` project deploys the local source snapshot to the `web` service, with a separate Railway PostgreSQL service. Deployment currently uses Railway CLI upload because Railway's GitHub integration does not have access to the repository. CLI uploads can include uncommitted changes and do not push them to GitHub. Grant repository access to that integration before enabling GitHub autodeploys.

The existing Dockerfile builds the Next.js standalone server and sync-worker bundles. The app binds to `0.0.0.0` using `PORT=3000`. `.railway/railway.ts` declares the Dockerfile builder, `/preview` health check (300 seconds), and restart-on-failure policy (5 retries).

Set `DATABASE_URL` to the Railway reference `${{Postgres.DATABASE_URL}}`, provide a generated `AUTH_SECRET`, set `AUTH_TRUST_HOST=true`, and set `AUTH_URL` and `NEXTAUTH_URL` to the public service URL. Secret values belong in Railway variables, never in source control.

The container's existing startup command uses `prisma db push --skip-generate` to initialize the schema before starting the standalone server. The current migration history does not contain an initial schema migration; do not replace this with `prisma migrate deploy` on an empty database until the migration history has a baseline. Schema synchronization runs without accepting data loss.

The public design preview uses fictional data and does not require OAuth. For real sign-in, configure `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` from a GitHub OAuth App and set its callback URL to `<service-url>/api/auth/callback/github`. Use `SUPERADMIN_GITHUB_USERNAME` for the administrator account. Configure GitHub/GitLab/Kerjabaik integration variables before syncing actual records.

Useful commands after linking the project:

```powershell
railway service status --service web --environment production
railway logs --service web --environment production --lines 100
railway up --service web --environment production --detach
```

## Verified deployment: 14 October 2026

- Deployment `224de894-6f5e-4528-82d3-1e51c51d9fa0`: `SUCCESS`, web / production.
- Public preview: https://web-production-dc87cc.up.railway.app/preview
- Typecheck and all smoke tests passed before upload. Railway Docker build and startup completed successfully; startup reported the database already matched the Prisma schema.
- Public preview/login, session/config endpoints, and generated JS/CSS returned HTTP 200. Unauthenticated dashboard and attention-center endpoints returned HTTP 401.
- Downloaded production assets contain weekly trends, the attention center, favorite filters, and the single-row dashboard statistics CSS.
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are not configured in Railway yet. The public preview can be reviewed without credentials; live login and integrations have not been verified.
- Browser automation was unavailable in this session. HTTP and production assets were checked, but pixel-level visual QA was not performed.
- Railway Config as Code was migrated to Infrastructure as Code on 14 October 2026; the legacy `railway.json` and its service binding were removed. See the procedure below.

## Infrastructure as Code

The named partial `web` owns only the existing web service. Postgres, its persistent volume, service domains and source uploads remain unchanged. Existing variable values are declared with `preserve()`; credentials are never exported into source. Before adding variables (including OAuth or integration credentials), add their names with `preserve()` and inspect the next plan. Omitted variables on an owned service can be deleted by IaC.

Use Railway CLI 5.42.1 or newer and `npm ci` to install the pinned `railway/iac` SDK. Link the existing project/environment, then:

```powershell
railway config plan --out iac-plan.json
railway config apply --plan iac-plan.json --yes
```

Review the entire plan first. Never approve resource/volume/variable deletion or use `--confirm-destructive` for this migration. Do not commit generated plans: keep them outside the repository. Run a second plan after applying; it must report no changes. CLI source uploads still require `railway up`.

On Windows, the npm CLI shim can prevent the SDK from checking the CLI version. Point its executable lookup to the installed native binary for this shell:

```powershell
$env:_ = Join-Path $env:APPDATA 'npm/node_modules/@railway/cli/bin/railway.exe'
& $env:_ --version
railway config plan
```

Migration verification: the reviewed plan contained only web build/deploy updates, with no destructive changes. The applied partial retains web service ID `d09d741c-ff6a-40f8-bf4c-da760a083527`. Railway stores its default restart policy as absent, so the declaration uses the documented default `On Failure` and explicitly sets 5 retries; declaring `ON_FAILURE` produces perpetual drift in CLI 5.63.3. [Restart policy defaults](https://docs.railway.com/deployments/restart-policy), [official IaC documentation](https://docs.railway.com/infrastructure-as-code).

Review findings and ready-to-copy issue drafts: [REVIEW_AND_BACKLOG.md](REVIEW_AND_BACKLOG.md).
