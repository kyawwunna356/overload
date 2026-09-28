import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // A static site in out/: one HTML file per screen, no server. Every screen is already a static
  // page that reads its ?id in the browser, so nothing here needs one — and a static site is what
  // the service worker can store whole on the phone, so the app opens with no signal (Ticket 38).
  output: "export",
  // The version in package.json, baked in at build time so the app can show which one is running
  // (the Back up screen) — useful once the service worker starts swapping versions in.
  env: { NEXT_PUBLIC_APP_VERSION: packageJson.version },
  // Dev only: lets VS Code's forwarded-port URLs (e.g. abc123-3000.euw.devtunnels.ms) load
  // dev assets, so the app can be tried on a phone over HTTPS. `**` covers the two labels
  // before the domain. Ignored in production builds.
  allowedDevOrigins: ["**.devtunnels.ms"],
};

export default nextConfig;
