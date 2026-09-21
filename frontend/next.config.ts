import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets VS Code's forwarded-port URLs (e.g. abc123-3000.euw.devtunnels.ms) load
  // dev assets, so the app can be tried on a phone over HTTPS. `**` covers the two labels
  // before the domain. Ignored in production builds.
  allowedDevOrigins: ["**.devtunnels.ms"],
};

export default nextConfig;
