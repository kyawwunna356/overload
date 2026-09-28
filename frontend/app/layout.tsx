import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Loading the font file has to happen in code; theme.css decides where it's used.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Installed from Safari's Share → Add to Home Screen, it opens full-screen as "Overload" (the
// manifest and icons are app/manifest.webmanifest, app/icon.png and app/apple-icon.png). The
// translucent status bar lets the dark page run under it; the layout already pads for the notch.
export const metadata: Metadata = {
  title: "Overload",
  description: "A personal strength log.",
  appleWebApp: {
    capable: true,
    title: "Overload",
    statusBarStyle: "black-translucent",
  },
};

// viewportFit "cover" lets the page reach under the iPhone notch and home bar,
// so the layout can pad for the safe areas itself.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The app is dark only; this tells the browser so from the first paint.
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
