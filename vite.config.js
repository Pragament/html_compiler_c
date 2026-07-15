import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: "/html_compiler_c/",
    resolve: {
        alias: {
            stream: path.resolve(__dirname, "src/stream-stub.js"),
            util: path.resolve(__dirname, "src/stream-stub.js"),
        },
    },
});