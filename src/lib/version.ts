/**
 * App version — injected at build time from package.json + git short hash
 * via next.config.ts `env.NEXT_PUBLIC_APP_VERSION`.
 * Falls back to the hardcoded string if the env var isn't present.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0';
