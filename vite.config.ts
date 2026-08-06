import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";

export default defineConfig({
  ssr: {
    noExternal: [
      "@tanstack/router-core",
      "@tanstack/react-start",
      "@tanstack/react-router",
      "@tanstack/router-plugin"
    ]
  },
  resolve: {
    tsconfigPaths: true
  },
  plugins: [
    tanstackRouter(),
    tanstackStart({
      server: { entry: "src/server.ts" },
    }),
    react(),
    tailwindcss(),
  ],
});
