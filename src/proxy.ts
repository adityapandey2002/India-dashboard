import { NextResponse, type NextRequest } from "next/server";

/**
 * Rate limit for the AI endpoints.
 *
 * `/api/ai/chat` and `/api/ai/insights` are unauthenticated proxies to a paid
 * Groq key, so without a limit anyone (or any scraper) can loop them and burn the
 * account. The body limits inside the routes cap each call's cost; this caps how
 * often a single IP can call at all.
 *
 * The buckets live in this module's memory, i.e. they are per server instance and
 * reset on restart — good enough for a single-node deployment or a first line of
 * defence, NOT a substitute for a shared store. To make it global, swap `buckets`
 * for Vercel KV / Upstash Redis with the same interface below.
 */

const WINDOW_MS = 60_000;

/** Generous limits: a real user never gets near these. */
const LIMITS: Record<string, number> = {
  "/api/ai/chat": 15,
  "/api/ai/insights": 30,
};

type Bucket = { count: number; resetAt: number };

// Next.js dev/prod keeps module state per instance; cap the map so a flood of
// spoofed IPs cannot grow it without bound.
const MAX_BUCKETS = 5_000;
const buckets = new Map<string, Bucket>();

function clientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return ip;
}

function hit(key: string, limit: number, now: number): { allowed: boolean; retryAfter: number } {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const limit = LIMITS[pathname];
  if (!limit) return NextResponse.next();

  const { allowed, retryAfter } = hit(clientKey(req), limit, Date.now());
  if (allowed) return NextResponse.next();

  return NextResponse.json(
    { error: "Too many AI requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export const config = {
  // Only the AI endpoints — every other route keeps the hot path untouched.
  matcher: ["/api/ai/:path*"],
};
