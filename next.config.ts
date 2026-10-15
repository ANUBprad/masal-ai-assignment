import type { NextConfig } from "next";

export interface SecurityHeader {
  key: string;
  value: string;
}

// Baseline security headers applied to every response. The app is same-origin
// JSON only: there are no third-party script origins, no cookies, and no
// embedded frames. `script-src` keeps `'unsafe-inline'` because Next.js emits
// inline bootstrap scripts and the pages are statically prerendered (a nonce
// would force dynamic rendering). See docs/PRODUCTION_AUDIT.md.
//
// `'unsafe-eval'` is added in development only. The React Refresh (Fast
// Refresh) runtime evaluates module code with `eval()`, so a policy without it
// aborts the client bundle under `next dev` and nothing hydrates — the Add Lead
// button stops responding. Production builds never eval, so the deployed policy
// stays strict and is unchanged.
export function buildSecurityHeaders(isDevelopment: boolean): SecurityHeader[] {
  const scriptSrc = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
      ].join("; ")
    }
  ];
}

const securityHeaders = buildSecurityHeaders(process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
