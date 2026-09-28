import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A static site in out/: one HTML file per screen, no server. Every screen is already a static
  // page that reads its ?id in the browser, so nothing here needs one — and a static site is what
  // the service worker can store whole on the phone, so the app opens with no signal (Ticket 38).
  output: "export",
  // Dev only: lets VS Code's forwarded-port URLs (e.g. abc123-3000.euw.devtunnels.ms) load
  // dev assets, so the app can be tried on a phone over HTTPS. `**` covers the two labels
  // before the domain. Ignored in production builds.
  allowedDevOrigins: ["**.devtunnels.ms"],
};

export default nextConfig;
