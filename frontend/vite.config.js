import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Ports come from the repository-root .env (the same file docker compose reads);
// real environment variables win, which is how the Docker build passes API_PORT.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, path.resolve(import.meta.dirname, ".."), ""), ...process.env };
  const apiPort = env.API_PORT || "8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_API_PORT": JSON.stringify(apiPort),
    },
    server: {
      port: Number(env.FRONTEND_DEV_PORT) || 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
