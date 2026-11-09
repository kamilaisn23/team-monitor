// Username-only login used for temporary demos without GitHub OAuth.
// Gated solely by the explicit AUTH_DEV_LOGIN flag so it can be enabled
// per-environment; keep it disabled in environments that must use GitHub.
export function isDevLoginEnabled() {
    return process.env.AUTH_DEV_LOGIN === "true";
}
