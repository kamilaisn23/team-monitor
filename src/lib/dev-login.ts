export function isDevLoginEnabled() {
    return (
        process.env.AUTH_DEV_LOGIN === "true" &&
        process.env.NODE_ENV !== "production"
    );
}
