import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin to serve apple-app-site-association with correct headers
const wellKnownHeaders = (): Plugin => ({
  name: 'well-known-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.includes('apple-app-site-association')) {
        res.setHeader('Content-Type', 'application/json');
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    wellKnownHeaders(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        '@capacitor/app',
        '@capacitor-firebase/messaging',
        '@capacitor/push-notifications',
      ],
    },
  },
}));
