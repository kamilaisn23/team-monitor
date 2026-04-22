import { NextRequest, NextResponse } from "next/server";

/**
 * Validates Bearer token against KERJABAIK_SERVICE_TOKENS (comma-separated).
 * Returns null on success, or a 401 NextResponse on failure.
 * Supports multiple tokens for zero-downtime rotation.
 */
export function requireServiceToken(
    req: NextRequest,
): NextResponse | null {
    const raw = process.env.KERJABAIK_SERVICE_TOKENS ?? "";
    const acceptedTokens = raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    if (acceptedTokens.length === 0) {
        console.warn("[service-auth] KERJABAIK_SERVICE_TOKENS is not configured");
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const provided = authHeader.slice(7);
    const matchIndex = acceptedTokens.indexOf(provided);

    if (matchIndex === -1) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    console.log(`[service-auth] authenticated caller using token slot ${matchIndex}`);
    return null;
}
