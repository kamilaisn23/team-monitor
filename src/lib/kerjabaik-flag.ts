export function isKerjabaikSyncEnabled(): boolean {
    return Boolean(process.env.KERJABAIK_BASE_URL && process.env.KERJABAIK_SERVICE_TOKEN)
}

export function kerjabaikBaseUrl(): string {
    return process.env.KERJABAIK_BASE_URL ?? ""
}
