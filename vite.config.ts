import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"
import { loadEnv } from "vite"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "")

  console.log("=== Environment Variables Debug ===")
  console.log("VITE_SUPABASE_URL:", env.VITE_SUPABASE_URL)
  console.log("VITE_SUPABASE_ANON_KEY:", env.VITE_SUPABASE_ANON_KEY)
  console.log("VITE_WEBSITE_URL:", env.VITE_WEBSITE_URL)
  console.log("VITE_SUPABASE_JWT:", env.VITE_SUPABASE_JWT)
  console.log(
    "VITE_GOOGLE_DESKTOP_CLIENT_ID:",
    env.VITE_GOOGLE_DESKTOP_CLIENT_ID
  )
  console.log("================================")

  return {
    plugins: [
      react(),
      electron([
        {
          entry: "electron/main.ts",
          vite: {
            build: {
              outDir: "dist-electron",
              sourcemap: true,
              minify: false,
              rollupOptions: {
                external: [
                  "electron",
                  ...Object.keys(require("./package.json").dependencies || {})
                ]
              }
            },
            resolve: {
              alias: {
                "@": path.resolve(__dirname, "src")
              }
            }
          }
        },
        {
          entry: "electron/preload.ts",
          vite: {
            build: {
              outDir: "dist-electron",
              sourcemap: true,
              minify: false,
              rollupOptions: {
                external: [
                  "electron",
                  ...Object.keys(require("./package.json").dependencies || {})
                ]
              }
            }
          },
          onstart(options) {
            options.reload()
          },
          watch: {
            pattern: ["electron/preload.ts"],
            buildDelay: 0
          }
        }
      ]),
      renderer()
    ],
    define: {
      "process.env": env,
      "process.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY
      ),
      "process.env.VITE_WEBSITE_URL": JSON.stringify(env.VITE_WEBSITE_URL),
      "process.env.VITE_SUPABASE_JWT": JSON.stringify(env.VITE_SUPABASE_JWT),
      "process.env.SUPABASE_SERVICE_ROLE_KEY": JSON.stringify(
        env.SUPABASE_SERVICE_ROLE_KEY
      ),
      "process.env.VITE_GOOGLE_DESKTOP_CLIENT_ID": JSON.stringify(
        env.VITE_GOOGLE_DESKTOP_CLIENT_ID
      )
    },
    build: {
      emptyOutDir: true,
      outDir: "dist"
    },
    clearScreen: true,
    server: {
      port: 54321,
      force: true,
      watch: {
        usePolling: true,
        interval: 100
      }
    }
  }
})
