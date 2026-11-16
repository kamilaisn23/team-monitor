// Username-only login used for temporary development without GitHub OAuth.
// Gated by an explicit environment flag; keep it disabled outside development.
export function isDevLoginEnabled() {
    return process.env.AUTH_DEV_LOGIN === "true";
}

// This intentionally grants the configured administrator identity to every
// visitor. Keep it opt-in and use it only on an isolated public demo.
export function isDemoSuperadminEnabled() {
    return process.env.AUTH_DEMO_SUPERADMIN === "true";
}
