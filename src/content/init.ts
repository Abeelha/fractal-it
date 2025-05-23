console.log("🎨 Fractal-it Enhanced: Init file starting...");

import { FractalViewer } from "./enhancedContent";

let fractalViewer: FractalViewer | null = null;

try {
  fractalViewer = new FractalViewer();
  console.log(
    "🎨 Fractal-it Enhanced: FractalViewer initialized successfully!"
  );
} catch (error) {
  console.error(
    "🎨 Fractal-it Enhanced: Failed to initialize FractalViewer:",
    error
  );
}

console.log("🎨 Fractal-it Enhanced: Content script fully initialized!");
console.log(
  "🎨 Fractal-it Enhanced: FractalViewer status:",
  fractalViewer ? "loaded" : "failed"
);

export { fractalViewer };
