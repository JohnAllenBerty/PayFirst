import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const target = env.VITE_API_TARGET || "http://localhost:8000/"
  // Base path for assets. For GitHub Pages project sites, set to "/<repo-name>/"
  // e.g. VITE_BASE="/PayFirst/" so built assets resolve under the project path.
  const base = env.VITE_BASE || "/"
  // If target already includes "/api" in its path, keep the current rewrite (strip "/api")
  // so that "/api/foo" -> target"/api" + "foo". Otherwise, allow opting out of rewrite
  // via VITE_API_PRESERVE_PREFIX=true to forward "/api/*" as-is to the backend.
  let rewrite:
    | undefined
    | ((p: string) => string)
  const targetPath = (() => {
    try { return new URL(target).pathname || "/" } catch { return "/" }
  })()
  const preservePrefix = env.VITE_API_PRESERVE_PREFIX === "true"
  if (targetPath.includes("/api")) {
    rewrite = (path) => path.replace(/^\/api/, "")
  } else if (!preservePrefix) {
    rewrite = (path) => path.replace(/^\/api/, "")
  } else {
    rewrite = undefined
  }
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          rewrite,
        }
      },
    },
  }
})