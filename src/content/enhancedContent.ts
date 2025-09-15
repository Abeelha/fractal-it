import {
  OptimizedFractalGenerator,
  OptimizedFractalMode,
  OptimizedRenderSettings,
} from "../fractal/optimizedGenerator";
import { HTMLAnalyzer, HTMLFeatures } from "../utils/htmlAnalyzer";

console.log("Fractal-it Enhanced: Content script loading...");

class FractalViewer {
  private generator: OptimizedFractalGenerator | null = null;
  private container: HTMLElement | null = null;
  private isActive = false;
  private analyzer = new HTMLAnalyzer();
  private currentFeatures: HTMLFeatures | null = null;
  private cachedModes: Map<
    string,
    { canvas: HTMLCanvasElement; generator: OptimizedFractalGenerator }
  > = new Map();
  private currentMode: string = 'tag-based';
  private performanceMonitor: HTMLElement | null = null;

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
            this.generateFractal(
              message.settings,
              message.mode || 'tag-based'
            );
            sendResponse({ success: true });
            return true;

          case "SWITCH_CACHED_MODE":
            console.log(
              "Fractal-it Enhanced: Switch cached mode:",
              message.mode
            );
            this.switchToMode(message.mode);
            sendResponse({ success: true });
            return true;

          case "GET_CACHED_MODES":
            console.log("Fractal-it Enhanced: Get cached modes request");
            const cachedModesList = Array.from(this.cachedModes.keys());
            sendResponse({ success: true, cachedModes: cachedModesList });
            return true;

          case "ANALYZE_WEBSITE":
            console.log("Fractal-it Enhanced: Analyze website request");
            const features = this.analyzeCurrentPage();
            sendResponse({ success: true, features });
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
    settings?: Partial<OptimizedRenderSettings>,
    mode: string = 'tag-based'
  ) {
    try {
      console.log("Fractal-it Enhanced: Starting fractal generation...");

      if (!this.container) {
        this.closeFractal();
      } else {
        const currentCanvas = this.container.querySelector("canvas");
        if (currentCanvas) {
          currentCanvas.remove();
        }
        const oldControls = document.querySelector(".fractal-controls");
        if (oldControls) {
          oldControls.remove();
        }
      }

      if (!this.currentFeatures) {
        this.currentFeatures = this.analyzeCurrentPage();
      }

      const generator = new OptimizedFractalGenerator();
      const html = document.documentElement.outerHTML;

      const optimizedSettings: OptimizedRenderSettings = {
        mode: mode,
        quality: settings?.quality || 'medium',
        animation: settings?.animation !== false,
        particleCount: 5000,
        enableBloom: false,
        enableDepthOfField: false,
        cacheStrategy: 'balanced'
      };

      const canvas = generator.generateFractal(html, optimizedSettings);

      this.cachedModes.set(mode, { canvas, generator });
      this.currentMode = mode;
      this.generator = generator;
      console.log(`🎨 Fractal-it Enhanced: Mode "${mode}" cached`);

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

  private switchToMode(mode: string) {
    if (this.generator) {
      console.log(`🎨 Fractal-it Enhanced: Switching to mode "${mode}"`);
      this.currentMode = mode;
      this.generator.switchMode(mode);
      this.updateControlsDisplay();
      return;
    }

    const cachedData = this.cachedModes.get(mode);
    if (!cachedData) {
      console.warn(`Mode "${mode}" not found in cache`);
      return;
    }

    console.log(`🎨 Fractal-it Enhanced: Switching to cached mode "${mode}"`);
    this.currentMode = mode;
    this.generator = cachedData.generator;

    if (this.container) {
      const currentCanvas = this.container.querySelector("canvas");
      if (currentCanvas) {
        currentCanvas.remove();
      }

      this.container.appendChild(cachedData.canvas);

      const oldControls = document.querySelector(".fractal-controls");
      if (oldControls) {
        oldControls.remove();
      }
      this.showControls();

      console.log(
        `🎨 Fractal-it Enhanced: Successfully switched to mode "${mode}"`
      );
    } else {
      console.error(
        "🎨 Fractal-it Enhanced: No container found for mode switch"
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

    const modes = this.generator?.getAvailableModes() || [];
    const modeButtons = modes.map(mode => `
      <button class="fractal-mode-btn" data-mode="${mode.id}">
        ${mode.name}
      </button>
    `).join('');

    controls.innerHTML = `
      <div class="fractal-control-panel">
        <div class="fractal-header">
          <div class="fractal-logo">◇ FRACTAL-IT OPTIMIZED ◇</div>
          <div class="fractal-mode" id="current-mode">${this.getModeDisplayName()} MODE</div>
        </div>

        <div class="fractal-border-top"></div>

        <div class="fractal-modes">
          <div class="fractal-mode-title">► SELECT FRACTAL MODE</div>
          <div class="fractal-mode-grid">
            ${modeButtons}
          </div>
        </div>

        <div class="fractal-border-mid"></div>

        <div class="fractal-instructions">
          <div class="fractal-instruction-title">► NAVIGATION CONTROLS</div>
          <div class="fractal-instruction">🖱️ DRAG → ROTATE VIEW</div>
          <div class="fractal-instruction">🖱️ SCROLL → ZOOM IN/OUT</div>
          <div class="fractal-instruction">⌨️ ESC → EXIT MATRIX</div>
          <div class="fractal-instruction">⌨️ P → PERFORMANCE STATS</div>
        </div>

        <div class="fractal-border-mid"></div>

        <div class="fractal-stats" id="fractal-stats">
          <div class="fractal-stat-item">
            <span class="fractal-stat-label">ACTIVE MODE:</span>
            <span class="fractal-stat-value" id="active-mode">${this.getModeDisplayName()}</span>
          </div>
          <div class="fractal-stat-item">
            <span class="fractal-stat-label">FPS:</span>
            <span class="fractal-stat-value" id="fps-counter">60</span>
          </div>
        </div>

        <div class="fractal-border-bottom"></div>

        <button class="fractal-btn fractal-btn-close">
          <span class="fractal-btn-icon">❌</span>
          <span class="fractal-btn-text">EXIT MATRIX</span>
        </button>
      </div>
    `;

    controls
      .querySelector(".fractal-btn-close")
      ?.addEventListener("click", () => {
        this.closeFractal();
      });

    controls.querySelectorAll(".fractal-mode-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const mode = (e.target as HTMLElement).dataset.mode;
        if (mode) {
          this.switchToMode(mode);
        }
      });
    });

    document.body.appendChild(controls);

    this.startPerformanceMonitoring();
  }

  private updateSettings(settings: Partial<OptimizedRenderSettings>) {
    if (this.generator) {
      this.generateFractal(settings, this.currentMode);
    }
  }

  private getModeDisplayName(): string {
    const modes = this.generator?.getAvailableModes() || [];
    const currentModeInfo = modes.find(m => m.id === this.currentMode);
    return currentModeInfo?.name || this.currentMode.toUpperCase();
  }

  private updateControlsDisplay(): void {
    const modeElement = document.getElementById('current-mode');
    const activeModeElement = document.getElementById('active-mode');

    if (modeElement) {
      modeElement.textContent = `${this.getModeDisplayName()} MODE`;
    }
    if (activeModeElement) {
      activeModeElement.textContent = this.getModeDisplayName();
    }

    document.querySelectorAll('.fractal-mode-btn').forEach(btn => {
      const btnMode = (btn as HTMLElement).dataset.mode;
      if (btnMode === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private startPerformanceMonitoring(): void {
    const updateStats = () => {
      if (!this.generator || !document.querySelector('.fractal-controls')) return;

      const stats = this.generator.getPerformanceStats();
      const fpsElement = document.getElementById('fps-counter');

      if (fpsElement) {
        fpsElement.textContent = stats.fps.toString();
      }

      requestAnimationFrame(updateStats);
    };

    updateStats();
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
      this.container.remove();
      this.container = null;
    }

    const allContainers = document.querySelectorAll(".fractal-container");
    allContainers.forEach((container) => {
      container.remove();
    });

    const allControls = document.querySelectorAll(".fractal-controls");
    allControls.forEach((controls) => {
      controls.remove();
    });


    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";

    if (this.generator && this.currentMode) {
      const cachedData = this.cachedModes.get(this.currentMode);
      if (!cachedData || cachedData.generator !== this.generator) {
        try {
          this.generator.dispose();
        } catch (error) {
          console.warn("Error disposing generator:", error);
        }
      }
    } else if (this.generator) {
      try {
        this.generator.dispose();
      } catch (error) {
        console.warn("Error disposing generator:", error);
      }
    }

    this.generator = null;
    this.isActive = false;

    console.log(
      `🎨 Fractal-it Enhanced: Fractal closed completely. Cached modes: ${this.cachedModes.size}`
    );

    document.body.offsetHeight;
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
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .fractal-container canvas {
        max-width: 90vw;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 0 30px #00ff88, 0 0 60px rgba(0, 255, 136, 0.3);
        border: 2px solid #00ff88;
      }

      .fractal-controls {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000000;
      }

      .fractal-control-panel {
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        backdrop-filter: blur(20px);
        border: 2px solid #00ff88;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1);
        color: #00ff88;
        font-family: "Courier New", monospace;
        min-width: 280px;
        position: relative;
      }

      .fractal-header {
        text-align: center;
        margin-bottom: 12px;
      }

      .fractal-logo {
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 2px;
        text-shadow: 0 0 10px #00ff88;
        margin-bottom: 4px;
      }

      .fractal-mode {
        font-size: 10px;
        opacity: 0.8;
        letter-spacing: 1px;
      }

      .fractal-border-top, .fractal-border-mid, .fractal-border-bottom {
        height: 1px;
        background: linear-gradient(90deg, transparent, #00ff88, transparent);
        margin: 12px 0;
        opacity: 0.6;
      }

      .fractal-instructions {
        margin-bottom: 12px;
      }

      .fractal-instruction-title {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 8px;
        text-shadow: 0 0 5px #00ff88;
      }

      .fractal-instruction {
        font-size: 9px;
        margin-bottom: 4px;
        opacity: 0.9;
        line-height: 1.3;
      }

      .fractal-stats {
        margin-bottom: 12px;
      }

      .fractal-stat-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 9px;
      }

      .fractal-stat-label {
        opacity: 0.8;
      }

      .fractal-stat-value {
        font-weight: bold;
        text-shadow: 0 0 3px #00ff88;
      }

      .fractal-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #001122 0%, #003344 100%);
        border: 2px solid #00ff88;
        color: #00ff88;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: "Courier New", monospace;
        border-radius: 4px;
        text-shadow: 0 0 5px #00ff88;
      }

      .fractal-btn:hover {
        background: linear-gradient(135deg, #002244 0%, #004466 100%);
        box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
        transform: translateY(-1px);
      }

      .fractal-btn-close {
        background: linear-gradient(45deg, #440000, #660000);
        border-color: #ff4444;
        color: #ff4444;
        text-shadow: 0 0 5px #ff4444;
      }

      .fractal-btn-close:hover {
        background: linear-gradient(45deg, #660000, #880000);
        border-color: #ff6666;
        box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
      }

      .fractal-btn-icon {
        font-size: 14px;
      }

      .fractal-btn-text {
        letter-spacing: 1px;
      }

      .fractal-modes {
        margin-bottom: 12px;
      }

      .fractal-mode-title {
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 8px;
        text-shadow: 0 0 5px #00ff88;
      }

      .fractal-mode-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .fractal-mode-btn {
        padding: 8px;
        background: linear-gradient(135deg, #001122 0%, #002233 100%);
        border: 1px solid #00ff88;
        color: #00ff88;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: "Courier New", monospace;
        border-radius: 4px;
        opacity: 0.7;
      }

      .fractal-mode-btn:hover {
        opacity: 1;
        background: linear-gradient(135deg, #002244 0%, #003355 100%);
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
      }

      .fractal-mode-btn.active {
        opacity: 1;
        background: linear-gradient(135deg, #003355 0%, #004466 100%);
        border-width: 2px;
        text-shadow: 0 0 5px #00ff88;
      }
    `;

    document.head.appendChild(styles);
  }
}

export { FractalViewer };
