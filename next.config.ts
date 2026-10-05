import type { NextConfig } from "next";

/**
 * Baseline hardening headers.
 *
 * The app loads no third-party scripts, styles or fonts (fonts are self-hosted by
 * `next/font`, and every request is same-origin), so a strict `default-src 'self'`
 * policy is compatible. `'unsafe-inline'`/`'unsafe-eval'` stay for the CSP because
 * Next.js inlines its bootstrap scripts and Turbopack uses eval for HMR; the real
 * value here is `object-src 'none'`, `frame-ancestors 'none'`, `base-uri` and
 * `form-action`. `ws:`/`wss:` are allowed for connect-src because browsers do not
 * consistently treat the dev HMR socket as 'self'.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
