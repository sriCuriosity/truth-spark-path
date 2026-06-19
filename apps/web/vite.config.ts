// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  nitro: {
    preset: "netlify",
  },
  vite: {
    envDir: "../../",
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      allowedHosts: true,
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        manifest: {
          name: "NEXUS",
          short_name: "NEXUS",
          description: "NEXUS is a learning cortex for people building real things in the real world.",
          theme_color: "#0A0E1A",
          background_color: "#0A0E1A",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/icon16.png",
              sizes: "16x16",
              type: "image/png",
            },
            {
              src: "/icon48.png",
              sizes: "48x48",
              type: "image/png",
            },
            {
              src: "/icon128.png",
              sizes: "128x128",
              type: "image/png",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/bmysxukoqzwunmxhhrah\.supabase\.co\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                networkTimeoutSeconds: 3,
              },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
