import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";


// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  assetsInclude: ['**/*.docx', '**/*.docx?arraybuffer', "**/*.gltf", "**/*.glb", "**/*.bin"],
})
