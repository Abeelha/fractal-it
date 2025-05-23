import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { HTMLAnalyzer, HTMLFeatures } from "../utils/htmlAnalyzer";
import { FractalAlgorithms, FractalParams } from "./algorithms";

export interface FractalSection {
  name: string;
  algorithm: string;
  enabled: boolean;
  position: THREE.Vector3;
  scale: number;
}

export interface RenderSettings {
  background: string;
  lighting: boolean;
  postProcessing: boolean;
  animation: boolean;
  quality: "low" | "medium" | "high";
}

export class EnhancedFractalGenerator {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private analyzer: HTMLAnalyzer;
  private currentMeshes: THREE.Object3D[] = [];
  private animationId: number | null = null;
  private features: HTMLFeatures | null = null;

  private algorithmMap = [
    "mandelbrot",
    "julia",
    "lorenz",
    "dragon",
    "sierpinski",
    "spirograph",
    "tree",
  ];

  constructor() {
    this.analyzer = new HTMLAnalyzer();
    this.initializeScene();
  }

  private initializeScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 500;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    this.setupLighting();
    this.setupWindowResize();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4070ff, 0.5, 100);
    pointLight1.position.set(-30, 30, 30);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4070, 0.5, 100);
    pointLight2.position.set(30, -30, -30);
    this.scene.add(pointLight2);
  }

  private setupWindowResize(): void {
    const handleResize = () => {
      if (this.camera && this.renderer) {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    (this as any)._resizeHandler = handleResize;
  }

  generateFractal(
    html: string,
    sections: FractalSection[] = [],
    settings: RenderSettings = {
      background: "dark",
      lighting: true,
      postProcessing: false,
      animation: true,
      quality: "high",
    },
  ): HTMLCanvasElement {
    this.clearPreviousFractal();
    this.features = this.analyzer.analyze(html);

    const defaultSections = this.createDefaultSections();
    const finalSections = sections.length > 0 ? sections : defaultSections;

    this.applySettings(settings);
    this.generateFractalSections(finalSections);
    this.positionCamera();
    this.startAnimation();

    return this.renderer.domElement;
  }

  private createDefaultSections(): FractalSection[] {
    if (!this.features) return [];

    const sections: FractalSection[] = [];
    const sectionTypes = [
      "header",
      "footer",
      "body",
      "section",
      "nav",
      "main",
      "article",
    ];

    sectionTypes.forEach((type, index) => {
      if (this.features!.tagCounts[type] > 0) {
        const algorithm = this.selectAlgorithmForSection(type, index);
        sections.push({
          name: type,
          algorithm,
          enabled: true,
          position: this.calculateSectionPosition(index, sections.length),
          scale: this.calculateSectionScale(type),
        });
      }
    });

    if (sections.length === 0) {
      sections.push({
        name: "default",
        algorithm: "mandelbrot",
        enabled: true,
        position: new THREE.Vector3(0, 0, 0),
        scale: 1,
      });
    }

    return sections;
  }

  private selectAlgorithmForSection(
    sectionType: string,
    index: number,
  ): string {
    const hash = this.simpleHash(sectionType + this.features!.structuralHash);
    const complexityFactor = this.features!.domComplexity.totalElements;

    let algorithmIndex: number;

    switch (sectionType) {
      case "header":
        algorithmIndex = (hash + complexityFactor) % 3;
        return ["mandelbrot", "julia", "spirograph"][algorithmIndex];

      case "footer":
        algorithmIndex = (hash + complexityFactor) % 2;
        return ["lorenz", "dragon"][algorithmIndex];

      case "body":
      case "main":
        algorithmIndex = (hash + complexityFactor) % 3;
        return ["sierpinski", "tree", "spirograph"][algorithmIndex];

      case "nav":
        return "dragon";

      case "section":
      case "article":
        algorithmIndex = (hash + complexityFactor) % 4;
        return ["tree", "julia", "mandelbrot", "spirograph"][algorithmIndex];

      default:
        return this.algorithmMap[index % this.algorithmMap.length];
    }
  }

  private calculateSectionPosition(
    index: number,
    totalSections: number,
  ): THREE.Vector3 {
    if (totalSections === 1) {
      return new THREE.Vector3(0, 0, 0);
    }

    const radius = 20 + totalSections * 3;
    const angle = (index * 2 * Math.PI) / totalSections;
    const height = Math.sin(angle * 2) * 10 + (index - totalSections / 2) * 5;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    );
  }

  private calculateSectionScale(sectionType: string): number {
    if (!this.features) return 1;

    const count = this.features.tagCounts[sectionType] || 1;
    const baseScale = 0.7 + Math.min(count / 10, 1.5);

    switch (sectionType) {
      case "body":
      case "main":
        return baseScale * 1.5;
      case "header":
      case "footer":
        return baseScale * 1.2;
      default:
        return baseScale;
    }
  }

  private generateFractalSections(sections: FractalSection[]): void {
    sections.forEach((section, index) => {
      if (!section.enabled || !this.features) return;

      const params: FractalParams = {
        iterations: this.calculateIterations(section.algorithm),
        complexity: this.features.domComplexity.avgNestingLevel,
        scale: section.scale,
        colorSeed:
          this.simpleHash(section.name + this.features.structuralHash) +
          index * 60,
        algorithm: section.algorithm,
        morphFactor: this.features.semanticStructure.nestingDepth / 10,
        animationSpeed: 1,
      };

      const fractalObject = this.createFractalObject(section.algorithm, params);

      if (fractalObject) {
        fractalObject.position.copy(section.position);
        fractalObject.scale.setScalar(section.scale);

        const rotationOffset = (index * Math.PI) / 3;
        fractalObject.rotation.set(
          rotationOffset,
          rotationOffset * 0.7,
          rotationOffset * 0.3,
        );

        this.scene.add(fractalObject);
        this.currentMeshes.push(fractalObject);
      }
    });
  }

  private createFractalObject(
    algorithm: string,
    params: FractalParams,
  ): THREE.Object3D | null {
    if (!this.features) return null;

    switch (algorithm) {
      case "mandelbrot":
        return FractalAlgorithms.generateMandelbrotSet(this.features, params);
      case "julia":
        return FractalAlgorithms.generateJuliaSet(this.features, params);
      case "lorenz":
        return FractalAlgorithms.generateLorenzAttractor(this.features, params);
      case "dragon":
        return FractalAlgorithms.generateDragonCurve(this.features, params);
      case "sierpinski":
        return FractalAlgorithms.generateSierpinskiTetrahedron(
          this.features,
          params,
        );
      case "spirograph":
        return FractalAlgorithms.generateSpirograph(this.features, params);
      case "tree":
        return FractalAlgorithms.generateFractalTree(this.features, params);
      default:
        return FractalAlgorithms.generateMandelbrotSet(this.features, params);
    }
  }

  private calculateIterations(algorithm: string): number {
    const baseIterations: Record<string, number> = {
      mandelbrot: 40,
      julia: 35,
      lorenz: 50,
      dragon: 20,
      sierpinski: 30,
      spirograph: 60,
      tree: 25,
    };

    const complexity = this.features?.domComplexity.totalElements || 100;
    const multiplier = Math.min(1 + complexity / 1000, 2);

    return Math.floor((baseIterations[algorithm] || 30) * multiplier);
  }

  private positionCamera(): void {
    if (!this.features) {
      this.camera.position.set(50, 30, 50);
      return;
    }

    const complexity = this.features.domComplexity.totalElements;
    const distance = 40 + Math.log(complexity + 1) * 10;
    const height = 20 + this.features.semanticStructure.nestingDepth * 2;

    this.camera.position.set(distance, height, distance);
    this.camera.lookAt(0, 0, 0);
  }

  private applySettings(settings: RenderSettings): void {
    switch (settings.background) {
      case "dark":
        this.renderer.setClearColor(0x000000, 1);
        break;
      case "light":
        this.renderer.setClearColor(0xf0f0f0, 1);
        break;
      case "gradient":
        this.scene.background = this.createGradientBackground();
        break;
    }

    this.controls.autoRotate = settings.animation;

    if (settings.quality === "high") {
      this.renderer.setPixelRatio(window.devicePixelRatio);
    } else if (settings.quality === "medium") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      this.renderer.setPixelRatio(1);
    }
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#1a1a2e");
    gradient.addColorStop(0.5, "#16213e");
    gradient.addColorStop(1, "#0f0f1e");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private startAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      this.currentMeshes.forEach((mesh, index) => {
        mesh.rotation.y += 0.005 * (1 + index * 0.2);
        mesh.rotation.x += 0.003 * (1 + index * 0.1);
      });

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  updateSections(sections: FractalSection[]): void {
    this.clearCurrentMeshes();
    this.generateFractalSections(sections);
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
      if (
        mesh instanceof THREE.Mesh ||
        mesh instanceof THREE.Points ||
        mesh instanceof THREE.Line
      ) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.currentMeshes = [];
  }

  getAnalyzedFeatures(): HTMLFeatures | null {
    return this.features;
  }

  dispose(): void {
    this.clearPreviousFractal();

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

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
