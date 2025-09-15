import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { HTMLAnalyzer, HTMLFeatures } from "../utils/htmlAnalyzer";
import { DynamicFractalAlgorithms, DynamicFractalParams } from "./dynamicAlgorithms";

export interface OptimizedFractalMode {
  id: string;
  name: string;
  description: string;
  algorithm: string;
  performance: 'ultra-fast' | 'fast' | 'balanced' | 'quality';
}

export interface OptimizedRenderSettings {
  mode: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  animation: boolean;
  particleCount: number;
  enableBloom: boolean;
  enableDepthOfField: boolean;
  cacheStrategy: 'aggressive' | 'balanced' | 'minimal';
}

export class OptimizedFractalGenerator {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private analyzer: HTMLAnalyzer;
  private currentMeshes: THREE.Object3D[] = [];
  private animationId: number | null = null;
  private features: HTMLFeatures | null = null;
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private performanceMonitor = {
    frameTime: 0,
    fps: 60,
    lastTime: performance.now()
  };

  private modes: OptimizedFractalMode[] = [
    {
      id: 'dna-helix',
      name: 'HTML DNA Helix',
      description: 'DNA-like helixes from HTML tags with glowing tubes',
      algorithm: 'tagBased',
      performance: 'fast'
    },
    {
      id: 'crystal-growth',
      name: 'Crystal Growth',
      description: 'Growing crystalline structures with fractal branches',
      algorithm: 'flowField',
      performance: 'fast'
    },
    {
      id: 'neural-network',
      name: 'Living Neural Network',
      description: 'Pulsing neurons with flowing signal particles',
      algorithm: 'neuralNetwork',
      performance: 'balanced'
    },
    {
      id: 'spider-web',
      name: 'Spider Web Dimension',
      description: 'Multi-layered webs with flying particles and dewdrops',
      algorithm: 'spiderWeb',
      performance: 'fast'
    },
    {
      id: 'mandala',
      name: 'Geometric Mandala',
      description: 'Sacred geometry patterns from semantic structure',
      algorithm: 'mandala',
      performance: 'fast'
    }
  ];

  constructor() {
    this.analyzer = new HTMLAnalyzer();
    this.initializeScene();
    this.setupPerformanceOptimizations();
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 10, 100);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x000000, 1);

    this.renderer.sortObjects = false;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    this.setupOptimizedLighting();
    this.setupWindowResize();
  }

  private setupOptimizedLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x404040, 0x000000, 0.5);
    this.scene.add(hemisphereLight);
  }

  private setupPerformanceOptimizations(): void {
    if (this.renderer) {
      this.renderer.info.autoReset = true;
    }

    const lodLevels = [
      { distance: 20, detail: 1.0 },
      { distance: 50, detail: 0.5 },
      { distance: 100, detail: 0.25 }
    ];

    (this as any).lodLevels = lodLevels;
  }

  private setupWindowResize(): void {
    const handleResize = () => {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    const debouncedResize = this.debounce(handleResize, 250);
    window.addEventListener("resize", debouncedResize);
    (this as any)._resizeHandler = debouncedResize;
  }

  generateFractal(
    html: string,
    settings: OptimizedRenderSettings = {
      mode: 'tag-based',
      quality: 'medium',
      animation: true,
      particleCount: 5000,
      enableBloom: false,
      enableDepthOfField: false,
      cacheStrategy: 'balanced'
    }
  ): HTMLCanvasElement {
    this.clearPreviousFractal();
    this.features = this.analyzer.analyze(html);

    this.applyCacheStrategy(settings.cacheStrategy);
    this.applyQualitySettings(settings.quality);

    const mode = this.modes.find(m => m.id === settings.mode) || this.modes[0];
    const fractalObject = this.generateFractalByMode(mode, settings);

    if (fractalObject) {
      this.scene.add(fractalObject);
      this.currentMeshes.push(fractalObject);
    }

    this.positionCamera();

    if (settings.animation) {
      this.startOptimizedAnimation();
    }

    return this.renderer.domElement;
  }

  private generateFractalByMode(
    mode: OptimizedFractalMode,
    settings: OptimizedRenderSettings
  ): THREE.Object3D | null {
    if (!this.features) return null;

    const params: DynamicFractalParams = {
      iterations: this.calculateOptimizedIterations(mode, settings.quality),
      complexity: this.features.domComplexity.avgNestingLevel,
      scale: 1,
      colorSeed: this.hashCode(this.features.structuralHash),
      algorithm: mode.algorithm,
      morphFactor: this.features.semanticStructure.nestingDepth / 10,
      animationSpeed: 1
    };

    switch (mode.algorithm) {
      case 'tagBased':
        return DynamicFractalAlgorithms.generateTagBasedFractal(this.features, params);

      case 'flowField':
        return DynamicFractalAlgorithms.generateFlowField(this.features, params);

      case 'neuralNetwork':
        return DynamicFractalAlgorithms.generateLivingNeuralNetwork(this.features, params);

      case 'spiderWeb':
        return DynamicFractalAlgorithms.generateSpiderWebDimension(this.features, params);

      case 'mandala':
        return DynamicFractalAlgorithms.generateGeometricMandala(this.features, params);

      default:
        return DynamicFractalAlgorithms.generateTagBasedFractal(this.features, params);
    }
  }

  private calculateOptimizedIterations(
    mode: OptimizedFractalMode,
    quality: string
  ): number {
    const baseIterations: Record<string, number> = {
      'ultra-fast': 10,
      'fast': 20,
      'balanced': 40,
      'quality': 60
    };

    const qualityMultiplier: Record<string, number> = {
      'low': 0.5,
      'medium': 1,
      'high': 1.5,
      'ultra': 2
    };

    return Math.floor(
      baseIterations[mode.performance] * (qualityMultiplier[quality] || 1)
    );
  }

  private applyCacheStrategy(strategy: string): void {
    switch (strategy) {
      case 'aggressive':
        this.geometryCache.clear();
        this.materialCache.clear();
        break;

      case 'minimal':
        if (this.geometryCache.size > 100) {
          const entriesToDelete = this.geometryCache.size - 50;
          let deleted = 0;
          for (const key of this.geometryCache.keys()) {
            if (deleted >= entriesToDelete) break;
            this.geometryCache.delete(key);
            deleted++;
          }
        }
        break;

      case 'balanced':
      default:
        if (this.geometryCache.size > 50) {
          this.geometryCache.clear();
        }
        if (this.materialCache.size > 30) {
          this.materialCache.clear();
        }
    }
  }

  private applyQualitySettings(quality: string): void {
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        break;

      case 'medium':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        break;

      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        break;

      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        break;
    }
  }

  private positionCamera(): void {
    if (!this.features) {
      this.camera.position.set(30, 20, 30);
      return;
    }

    const complexity = this.features.domComplexity.totalElements;
    const distance = 25 + Math.log(complexity + 1) * 5;
    const height = 15 + this.features.semanticStructure.nestingDepth;

    this.camera.position.set(distance, height, distance);
    this.camera.lookAt(0, 0, 0);
  }

  private startOptimizedAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

      frameCount++;
      if (frameCount % 30 === 0) {
        this.performanceMonitor.fps = Math.round(1000 / deltaTime);
        this.performanceMonitor.frameTime = deltaTime;

        if (this.performanceMonitor.fps < 30) {
          this.reduceQuality();
        }
      }

      const rotationSpeed = Math.min(0.005, 60 / this.performanceMonitor.fps * 0.005);

      this.currentMeshes.forEach((mesh, index) => {
        if (mesh.userData.animated !== false) {
          mesh.rotation.y += rotationSpeed * (1 + index * 0.1);
          mesh.rotation.x += rotationSpeed * 0.6 * (1 + index * 0.05);
        }
      });

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private reduceQuality(): void {
    const currentPixelRatio = this.renderer.getPixelRatio();
    if (currentPixelRatio > 1) {
      this.renderer.setPixelRatio(Math.max(1, currentPixelRatio - 0.5));
    }

    this.currentMeshes.forEach(mesh => {
      if (mesh instanceof THREE.Points && mesh.material instanceof THREE.PointsMaterial) {
        mesh.material.size = Math.max(0.1, mesh.material.size * 0.8);
      }
    });
  }

  switchMode(modeId: string): void {
    const mode = this.modes.find(m => m.id === modeId);
    if (!mode || !this.features) return;

    this.clearCurrentMeshes();

    const settings: OptimizedRenderSettings = {
      mode: modeId,
      quality: 'medium',
      animation: true,
      particleCount: 5000,
      enableBloom: false,
      enableDepthOfField: false,
      cacheStrategy: 'balanced'
    };

    const fractalObject = this.generateFractalByMode(mode, settings);
    if (fractalObject) {
      this.scene.add(fractalObject);
      this.currentMeshes.push(fractalObject);
    }
  }

  getAvailableModes(): OptimizedFractalMode[] {
    return this.modes;
  }

  getPerformanceStats(): { fps: number; frameTime: number; drawCalls: number } {
    return {
      fps: this.performanceMonitor.fps,
      frameTime: this.performanceMonitor.frameTime,
      drawCalls: this.renderer.info.render.calls
    };
  }

  exportImage(width: number = 1920, height: number = 1080): string {
    const currentSize = this.renderer.getSize(new THREE.Vector2());

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL("image/png", 1.0);

    this.renderer.setSize(currentSize.x, currentSize.y);
    this.camera.aspect = currentSize.x / currentSize.y;
    this.camera.updateProjectionMatrix();

    return dataURL;
  }

  private clearPreviousFractal(): void {
    this.clearCurrentMeshes();

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private clearCurrentMeshes(): void {
    this.currentMeshes.forEach((mesh) => {
      this.scene.remove(mesh);

      if (mesh instanceof THREE.Mesh || mesh instanceof THREE.Points || mesh instanceof THREE.Line) {
        if (!this.geometryCache.has(mesh.geometry.uuid)) {
          mesh.geometry.dispose();
        }

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => {
            if (!this.materialCache.has(material.uuid)) {
              material.dispose();
            }
          });
        } else {
          if (!this.materialCache.has(mesh.material.uuid)) {
            mesh.material.dispose();
          }
        }
      }

      if (mesh instanceof THREE.Group) {
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    });

    this.currentMeshes = [];
  }

  dispose(): void {
    this.clearPreviousFractal();

    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();

    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();

    if ((this as any)._resizeHandler) {
      window.removeEventListener("resize", (this as any)._resizeHandler);
      (this as any)._resizeHandler = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null!;
    }

    if (this.controls) {
      this.controls.dispose();
      this.controls = null!;
    }

    if (this.scene) {
      this.scene = null!;
    }

    this.camera = null!;
  }

  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}