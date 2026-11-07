import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
let build = "local";
try {
  build =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {}
const config: NextConfig = {
  env: { NEXT_PUBLIC_SAVIO_BUILD: build },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
