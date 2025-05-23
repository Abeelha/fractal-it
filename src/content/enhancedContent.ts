import {
  EnhancedFractalGenerator,
  FractalSection,
  RenderSettings,
} from "../fractal/enhancedGenerator";
import { HTMLAnalyzer, HTMLFeatures } from "../utils/htmlAnalyzer";

console.log("Fractal-it Enhanced: Content script loading...");

class FractalViewer {
  private generator: EnhancedFractalGenerator | null = null;
  private container: HTMLElement | null = null;
  private isActive = false;
  private analyzer = new HTMLAnalyzer();
  private currentFeatures: HTMLFeatures | null = null;

  constructor() {
    console.log("Fractal-it Enhanced: FractalViewer constructor called");
    this.init();
  }

  init() {
    console.log("Fractal-it Enhanced: Initializing...");
    this.setupMessageListener();
    this.injectStyles();
    console.log("Fractal-it Enhanced: Initialization complete");
  }

  private setupMessageListener() {
    console.log("Fractal-it Enhanced: Setting up message listener...");

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("Fractal-it Enhanced: Message received:", message.action);

      try {
        switch (message.action) {
          case "PING":
            sendResponse({ success: true, message: "Content script loaded" });
            return true;

          case "GENERATE_ENHANCED_FRACTAL":
            console.log("Fractal-it Enhanced: Generate fractal request");
            this.generateFractal(message.sections, message.settings);
            sendResponse({ success: true });
            return true;

          case "ANALYZE_WEBSITE":
            console.log("Fractal-it Enhanced: Analyze website request");
            const features = this.analyzeCurrentPage();
            sendResponse({ success: true, features });
            return true;

          case "EXPORT_FRACTAL_IMAGE":
            console.log("Fractal-it Enhanced: Export image request");
            this.exportImage();
            sendResponse({ success: true });
            return true;

          case "UPDATE_FRACTAL_SETTINGS":
            console.log("Fractal-it Enhanced: Update settings request");
            this.updateSettings(message.settings);
            sendResponse({ success: true });
            return true;

          case "CLOSE_FRACTAL":
            console.log("Fractal-it Enhanced: Close fractal request");
            this.closeFractal();
            sendResponse({ success: true });
            return true;

          default:
            console.log("Fractal-it Enhanced: Unknown action:", message.action);
            sendResponse({ success: false, error: "Unknown action" });
            return true;
        }
      } catch (error) {
        console.error(
          "Fractal-it Enhanced: Error handling message:",
          error instanceof Error ? error.message : "Unknown error"
        );
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return true;
      }
    });

    console.log("Fractal-it Enhanced: Message listener setup complete");
  }

  private async generateFractal(
    sections: FractalSection[],
    settings: RenderSettings
  ) {
    try {
      console.log("Fractal-it Enhanced: Starting fractal generation...");

      this.closeFractal();

      if (!this.currentFeatures) {
        this.currentFeatures = this.analyzeCurrentPage();
      }

      this.generator = new EnhancedFractalGenerator();
      const html = document.documentElement.outerHTML;
      const canvas = this.generator.generateFractal(html, sections, settings);

      this.displayFractal(canvas);
      this.showControls();

      console.log("Fractal-it Enhanced: Fractal generation complete");
    } catch (error) {
      console.error(
        "Fractal-it Enhanced: Error generating fractal:",
        error instanceof Error ? error.message : "Unknown error"
      );
      alert(
        `Error generating fractal: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private analyzeCurrentPage(): HTMLFeatures {
    console.log("Fractal-it Enhanced: Analyzing current page...");
    try {
      const html = document.documentElement.outerHTML;
      const features = this.analyzer.analyze(html);
      console.log("Fractal-it Enhanced: Analysis complete:", features);
      return features;
    } catch (error) {
      console.error(
        "Fractal-it Enhanced: Error analyzing page:",
        error instanceof Error ? error.message : "Unknown error"
      );
      return {
        tagCounts: { div: 50, span: 30, p: 20 },
        classCounts: { container: 10, content: 15 },
        idCounts: { main: 1, header: 1 },
        attributeCounts: { class: 25, id: 5 },
        semanticStructure: {
          nestingDepth: 3,
          semanticTags: ["div", "span", "p"],
          interactiveTags: ["button", "a"],
          mediaTags: ["img"],
        },
        domComplexity: {
          totalElements: 100,
          uniqueTags: 10,
          avgNestingLevel: 3,
          maxNestingLevel: 8,
        },
        contentMetrics: {
          textLength: 1000,
          imageCount: 5,
          linkCount: 20,
          formElements: 2,
        },
        colorPalette: ["#000000", "#ffffff"],
        structuralHash: "default",
      };
    }
  }

  private displayFractal(canvas: HTMLCanvasElement) {
    console.log("Fractal-it Enhanced: Displaying fractal...");

    this.container = document.createElement("div");
    this.container.className = "fractal-container";
    this.container.appendChild(canvas);
    document.body.appendChild(this.container);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeFractal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    (this.container as any)._escapeHandler = handleEscape;
  }

  private showControls() {
    const controls = document.createElement("div");
    controls.className = "fractal-controls";
    controls.innerHTML = `
      <div class="fractal-control-panel">
        <h3>🎨 Fractal Controls</h3>
        <button class="fractal-btn fractal-btn-export">📸 Export</button>
        <button class="fractal-btn fractal-btn-close">❌ Close</button>
      </div>
    `;

    controls
      .querySelector(".fractal-btn-export")
      ?.addEventListener("click", () => {
        this.exportImage();
      });

    controls
      .querySelector(".fractal-btn-close")
      ?.addEventListener("click", () => {
        this.closeFractal();
      });

    document.body.appendChild(controls);
  }

  private updateSettings(settings: RenderSettings) {
    if (this.generator) {
      this.generateFractal([], settings);
    }
  }

  private exportImage() {
    console.log("Fractal-it Enhanced: Exporting image...");
    if (this.generator) {
      this.generator.exportImage();
    }
  }

  closeFractal() {
    console.log("Fractal-it Enhanced: Closing fractal...");

    if (this.container && (this.container as any)._escapeHandler) {
      document.removeEventListener(
        "keydown",
        (this.container as any)._escapeHandler
      );
    }

    if (this.container) {
      this.container.style.opacity = "0";
      this.container.style.transition = "opacity 0.5s ease";
      setTimeout(() => {
        if (this.container) {
          this.container.remove();
          this.container = null;
        }
      }, 500);
    }

    const controls = document.querySelector(".fractal-controls");
    if (controls) {
      controls.remove();
    }

    if (this.generator) {
      try {
        this.generator.dispose();
      } catch (error) {
        console.warn("Error disposing generator:", error);
      }
      this.generator = null;
    }

    this.isActive = false;
  }

  private injectStyles() {
    const existingStyles = document.getElementById("fractal-styles");
    if (existingStyles) return;

    const styles = document.createElement("style");
    styles.id = "fractal-styles";
    styles.textContent = `
      .fractal-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999999;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.5s ease;
      }

      .fractal-container canvas {
        max-width: 90vw;
        max-height: 90vh;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      }

      .fractal-controls {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000000;
        animation: slideInRight 0.5s ease;
      }

      .fractal-control-panel {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        backdrop-filter: blur(20px);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        min-width: 200px;
      }

      .fractal-control-panel h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
      }

      .fractal-btn {
        width: 100%;
        padding: 12px;
        margin: 8px 0;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: block;
      }

      .fractal-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .fractal-btn-export {
        background: linear-gradient(45deg, #56ab2f, #a8e6cf);
      }

      .fractal-btn-close {
        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;

    document.head.appendChild(styles);
  }
}

export { FractalViewer };
