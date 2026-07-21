import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "/html_compiler_c/",
    build: {
        rollupOptions: {
            external: ['browsercc', '@bjorn3/browser_wasi_shim']
        }
    },
    optimizeDeps: {
        exclude: ['browsercc', '@bjorn3/browser_wasi_shim']
    }
});