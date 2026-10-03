import type { Viewport } from "next";

// Tint Safari's status bar and toolbar with the basemap's background so the map
// reads edge to edge (Safari keeps those areas for itself).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#212224" },
  ],
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <div className="map-page">{children}</div>;
}
