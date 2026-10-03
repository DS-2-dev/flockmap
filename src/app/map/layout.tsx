import type { Viewport } from "next";

// Tint Safari's status bar and toolbar with the basemap's background so the map
// reads edge to edge (Safari keeps those areas for itself).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <div className="map-page">{children}</div>;
}
