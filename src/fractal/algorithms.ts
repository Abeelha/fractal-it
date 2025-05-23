import * as THREE from "three";
import { HTMLFeatures } from "../utils/htmlAnalyzer";

export interface FractalParams {
  iterations: number;
  complexity: number;
  scale: number;
  colorSeed: number;
  algorithm: string;
  morphFactor: number;
  animationSpeed: number;
}

export class FractalAlgorithms {
  static generateMandelbrotSet(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const complexity = Math.min(features.domComplexity.totalElements / 100, 5);
    const zoom = 0.5 + features.semanticStructure.nestingDepth * 0.1;
    const offsetX = (features.contentMetrics.linkCount % 100) * 0.001;
    const offsetY = (features.contentMetrics.imageCount % 100) * 0.001;

    for (let i = 0; i < params.iterations; i++) {
      for (let j = 0; j < params.iterations; j++) {
        const x0 = ((i - params.iterations / 2) * zoom) / 100 + offsetX;
        const y0 = ((j - params.iterations / 2) * zoom) / 100 + offsetY;

        let x = 0,
          y = 0,
          iteration = 0;
        while (x * x + y * y <= 4 && iteration < 100) {
          const xtemp = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xtemp;
          iteration++;
        }

        if (iteration < 100) {
          vertices.push(
            (i - params.iterations / 2) * 0.1,
            (j - params.iterations / 2) * 0.1,
            iteration * 0.5,
          );

          const hue = ((iteration * 360) / 100 + params.colorSeed) % 360;
          const saturation =
            80 + ((features.semanticStructure.semanticTags.length * 2) % 20);
          const lightness = 50 + (iteration % 30);

          const color = new THREE.Color(
            `hsl(${hue}, ${saturation}%, ${lightness}%)`,
          );
          colors.push(color.r, color.g, color.b);
        }
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.8 + complexity * 0.2,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  static generateJuliaSet(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const cReal = -0.7 + (features.domComplexity.uniqueTags % 20) * 0.05;
    const cImag = 0.27015 + (features.contentMetrics.formElements % 10) * 0.02;
    const complexity = Math.min(features.domComplexity.totalElements / 50, 8);

    for (let i = 0; i < params.iterations; i++) {
      for (let j = 0; j < params.iterations; j++) {
        let x = ((i - params.iterations / 2) * 3) / params.iterations;
        let y = ((j - params.iterations / 2) * 3) / params.iterations;
        let iteration = 0;

        while (x * x + y * y <= 4 && iteration < 100) {
          const xtemp = x * x - y * y + cReal;
          y = 2 * x * y + cImag;
          x = xtemp;
          iteration++;
        }

        if (iteration < 100) {
          vertices.push(
            (i - params.iterations / 2) * 0.15,
            (j - params.iterations / 2) * 0.15,
            Math.sin(iteration * 0.1) * complexity,
          );

          const hue =
            ((iteration * 180) / 100 +
              params.colorSeed +
              features.colorPalette.length * 20) %
            360;
          const color = new THREE.Color(`hsl(${hue}, 90%, 60%)`);
          colors.push(color.r, color.g, color.b);
        }
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.5 + complexity * 0.1,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  static generateDragonCurve(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const depth = Math.min(features.semanticStructure.nestingDepth + 8, 16);
    const scale = 0.5 + features.domComplexity.avgNestingLevel * 0.1;

    let sequence = "1";
    for (let i = 0; i < depth; i++) {
      let newSequence = "";
      for (let j = 0; j < sequence.length; j++) {
        if (sequence[j] === "1") {
          newSequence += "1R2";
        } else {
          newSequence += "1L2";
        }
      }
      sequence = newSequence;
    }

    let x = 0,
      y = 0,
      z = 0;
    let direction = 0;

    for (
      let i = 0;
      i < Math.min(sequence.length, params.iterations * 10);
      i++
    ) {
      const char = sequence[i];

      if (char === "1" || char === "2") {
        const oldX = x,
          oldY = y,
          oldZ = z;
        x += Math.cos(direction) * scale;
        y += Math.sin(direction) * scale;
        z +=
          Math.sin(i * 0.01 + features.domComplexity.totalElements * 0.001) *
          scale *
          0.5;

        vertices.push(oldX, oldY, oldZ, x, y, z);

        const hue = ((i * 180) / sequence.length + params.colorSeed) % 360;
        const color = new THREE.Color(`hsl(${hue}, 85%, 65%)`);
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      } else if (char === "R") {
        direction += Math.PI / 2;
      } else if (char === "L") {
        direction -= Math.PI / 2;
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });

    return new THREE.LineSegments(geometry, material);
  }

  static generateSierpinskiTetrahedron(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const group = new THREE.Group();
    const depth = Math.min(features.semanticStructure.nestingDepth + 3, 8);
    const baseSize = 5 + features.domComplexity.uniqueTags * 0.2;

    const tetrahedronVertices = [
      new THREE.Vector3(0, baseSize, 0),
      new THREE.Vector3(-baseSize, -baseSize, baseSize),
      new THREE.Vector3(baseSize, -baseSize, baseSize),
      new THREE.Vector3(0, -baseSize, -baseSize),
    ];

    this.recursiveSierpinski(
      tetrahedronVertices,
      depth,
      group,
      features,
      params,
      0,
    );

    return group;
  }

  private static recursiveSierpinski(
    vertices: THREE.Vector3[],
    depth: number,
    group: THREE.Group,
    features: HTMLFeatures,
    params: FractalParams,
    level: number,
  ): void {
    if (depth <= 0 || level > 15) {
      const geometry = new THREE.TetrahedronGeometry(0.2);
      const hue = (level * 60 + params.colorSeed) % 360;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(`hsl(${hue}, 80%, 60%)`),
      });

      const center = new THREE.Vector3();
      vertices.forEach((v) => center.add(v));
      center.divideScalar(4);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      group.add(mesh);
      return;
    }

    const midpoints = [
      vertices[0].clone().add(vertices[1]).divideScalar(2),
      vertices[0].clone().add(vertices[2]).divideScalar(2),
      vertices[0].clone().add(vertices[3]).divideScalar(2),
      vertices[1].clone().add(vertices[2]).divideScalar(2),
      vertices[1].clone().add(vertices[3]).divideScalar(2),
      vertices[2].clone().add(vertices[3]).divideScalar(2),
    ];

    this.recursiveSierpinski(
      [vertices[0], midpoints[0], midpoints[1], midpoints[2]],
      depth - 1,
      group,
      features,
      params,
      level + 1,
    );
    this.recursiveSierpinski(
      [vertices[1], midpoints[0], midpoints[3], midpoints[4]],
      depth - 1,
      group,
      features,
      params,
      level + 1,
    );
    this.recursiveSierpinski(
      [vertices[2], midpoints[1], midpoints[3], midpoints[5]],
      depth - 1,
      group,
      features,
      params,
      level + 1,
    );
    this.recursiveSierpinski(
      [vertices[3], midpoints[2], midpoints[4], midpoints[5]],
      depth - 1,
      group,
      features,
      params,
      level + 1,
    );
  }

  static generateLorenzAttractor(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    let x = 0.1,
      y = 0,
      z = 0;
    const sigma = 10 + (features.domComplexity.totalElements % 100) * 0.1;
    const rho = 28 + (features.contentMetrics.textLength % 1000) * 0.01;
    const beta =
      8 / 3 + (features.semanticStructure.semanticTags.length % 10) * 0.1;

    for (let i = 0; i < params.iterations * 20; i++) {
      const dt = 0.01;
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;

      x += dx;
      y += dy;
      z += dz;

      vertices.push(x * 0.3, y * 0.3, z * 0.3);

      const distance = Math.sqrt(x * x + y * y + z * z);
      const hue = (distance * 10 + params.colorSeed + i * 0.5) % 360;
      const color = new THREE.Color(`hsl(${hue}, 90%, 60%)`);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.3,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 1,
    });
    const line = new THREE.Line(geometry, lineMaterial);

    const group = new THREE.Group();
    group.add(points);
    group.add(line);

    return group;
  }

  static generateSpirograph(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const R = 5 + features.domComplexity.uniqueTags * 0.5;
    const r = 2 + features.contentMetrics.linkCount * 0.01;
    const d = 3 + features.contentMetrics.imageCount * 0.02;
    const layers = Math.min(
      features.semanticStructure.semanticTags.length + 2,
      8,
    );

    for (let layer = 0; layer < layers; layer++) {
      const layerR = R + layer * 2;
      const layerr = r + layer * 0.5;
      const layerd = d + layer * 0.3;
      const zOffset = layer * 2;

      for (let i = 0; i < params.iterations * 5; i++) {
        const t = i * 0.1;
        const x =
          (layerR - layerr) * Math.cos(t) +
          layerd * Math.cos(((layerR - layerr) / layerr) * t);
        const y =
          (layerR - layerr) * Math.sin(t) -
          layerd * Math.sin(((layerR - layerr) / layerr) * t);
        const z = zOffset + Math.sin(t * 0.2) * 2;

        vertices.push(x * 0.3, y * 0.3, z * 0.3);

        const hue = (t * 30 + layer * 45 + params.colorSeed) % 360;
        const saturation = 70 + layer * 5;
        const lightness = 50 + Math.sin(t * 0.1) * 20;

        const color = new THREE.Color(
          `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        );
        colors.push(color.r, color.g, color.b);
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });

    return new THREE.Line(geometry, material);
  }

  static generateFractalTree(
    features: HTMLFeatures,
    params: FractalParams,
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const maxDepth = Math.min(features.semanticStructure.nestingDepth + 6, 12);
    const branchingFactor = Math.min(features.domComplexity.uniqueTags + 2, 6);

    this.generateBranch(
      0,
      0,
      0,
      0,
      8,
      0,
      maxDepth,
      branchingFactor,
      vertices,
      colors,
      features,
      params,
    );

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
    });

    return new THREE.LineSegments(geometry, material);
  }

  private static generateBranch(
    startX: number,
    startY: number,
    startZ: number,
    endX: number,
    endY: number,
    endZ: number,
    depth: number,
    branchingFactor: number,
    vertices: number[],
    colors: number[],
    features: HTMLFeatures,
    params: FractalParams,
  ): void {
    if (depth <= 0 || depth > 20) return;

    vertices.push(startX, startY, startZ, endX, endY, endZ);

    const hue = ((12 - depth) * 30 + params.colorSeed) % 360;
    const saturation = 60 + depth * 5;
    const lightness = 40 + depth * 3;

    const color = new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);

    const length = Math.sqrt(
      (endX - startX) ** 2 + (endY - startY) ** 2 + (endZ - startZ) ** 2,
    );
    const newLength = length * (0.6 + Math.random() * 0.2);

    for (let i = 0; i < branchingFactor; i++) {
      const angle = (i * 2 * Math.PI) / branchingFactor + Math.random() * 0.5;
      const tilt = (Math.random() - 0.5) * Math.PI * 0.3;

      const newEndX = endX + Math.cos(angle) * Math.cos(tilt) * newLength;
      const newEndY = endY + newLength * 0.8;
      const newEndZ = endZ + Math.sin(angle) * Math.cos(tilt) * newLength;

      this.generateBranch(
        endX,
        endY,
        endZ,
        newEndX,
        newEndY,
        newEndZ,
        depth - 1,
        Math.max(2, branchingFactor - 1),
        vertices,
        colors,
        features,
        params,
      );
    }
  }
}
