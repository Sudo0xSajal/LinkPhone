import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkPhone",
    short_name: "LinkPhone",
    description: "Remote phone companion",
    start_url: "/",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#000000",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  };
}
