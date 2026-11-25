import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Serve a single CPU-only runtime for both models from the app's own origin.
const root = fileURLToPath(new URL("../", import.meta.url));
const ort = path.join(root, "node_modules/onnxruntime-web/dist");
const output = path.join(root, "public/vision-runtime");
await mkdir(output, { recursive: true });
await build({
  entryPoints: [path.join(root, "lib/vehicle-scan.worker.ts")],
  outfile: path.join(output, "vehicle-scan.js"),
  platform: "browser",
  format: "esm",
  bundle: true,
  minify: true,
  alias: { "onnxruntime-web": path.join(ort, "ort.wasm.min.mjs") },
  // OpenCV also ships a Node backend. Its built-ins are unused in a Web Worker.
  external: ["fs", "path", "crypto", "node:*"],
});
for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  await copyFile(path.join(ort, file), path.join(output, file));
}
