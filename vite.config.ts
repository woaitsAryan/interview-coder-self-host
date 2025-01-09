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
        }
      ]),
      renderer()
    ],
    define: {
      "process.env": env
    }
  }
})
