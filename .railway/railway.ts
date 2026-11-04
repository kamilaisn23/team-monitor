import { defineRailway, preserve, project, service } from "railway/iac";

// Own only web: the existing Postgres service, volume, variables and domains
// remain managed in Railway. Never change this to a whole-project declaration.
export const partial = "web";

export default defineRailway(() => {
  const web = service("web", {
    // Explicitly preserve existing values; no credentials belong in source.
    // Add newly provisioned variable names here before applying another plan.
    env: {
      AUTH_SECRET: preserve(),
      AUTH_TRUST_HOST: preserve(),
      AUTH_URL: preserve(),
      DATABASE_URL: preserve(),
      HOSTNAME: preserve(),
      NEXTAUTH_URL: preserve(),
      PORT: preserve(),
      SUPERADMIN_GITHUB_USERNAME: preserve(),
    },
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    deploy: {
      healthcheckPath: "/preview",
      healthcheckTimeout: 300,
      // ON_FAILURE is Railway's default (stored as null by its config API).
      // Declaring it explicitly creates perpetual drift in CLI 5.63.3.
      restartPolicyMaxRetries: 5,
    },
  });
  return project("team-monitor", {
    resources: [web],
  });
});
