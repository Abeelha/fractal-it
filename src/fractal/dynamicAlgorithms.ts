import * as THREE from "three";
import { HTMLFeatures } from "../utils/htmlAnalyzer";

export interface DynamicFractalParams {
  iterations: number;
  complexity: number;
  scale: number;
  colorSeed: number;
  algorithm: string;
  morphFactor: number;
  animationSpeed: number;
}

interface TagSignature {
  shape: 'circle' | 'triangle' | 'square' | 'hexagon' | 'star' | 'spiral' | 'wave';
  color: THREE.Color;
  size: number;
  rotation: number;
  depth: number;
  connections: number;
}

export class DynamicFractalAlgorithms {
  private static tagShapeMap: Record<string, string> = {
    div: 'square',
    span: 'circle',
    p: 'wave',
    a: 'star',
    img: 'hexagon',
    video: 'hexagon',
    h1: 'triangle',
    h2: 'triangle',
    h3: 'triangle',
    header: 'wave',
    nav: 'spiral',
    section: 'square',
    article: 'hexagon',
    button: 'star',
    input: 'circle',
    form: 'square',
    ul: 'spiral',
    ol: 'spiral',
    li: 'circle',
    table: 'square',
    footer: 'wave',
    main: 'hexagon',
    aside: 'triangle',
    figure: 'hexagon',
    canvas: 'star',
    svg: 'star'
  };

  private static colorSchemes = {
    structural: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    semantic: ['#FD79A8', '#A29BFE', '#74B9FF', '#55EFC4', '#FDCB6E'],
    interactive: ['#E17055', '#00B894', '#6C5CE7', '#FDCB6E', '#00CEC9'],
    media: ['#FAB1A0', '#FF7675', '#FD79A8', '#E84393', '#BE2EDD'],
    text: ['#81ECEC', '#74B9FF', '#A29BFE', '#DFE6E9', '#B2BEC3'],
    navigation: ['#00D2D3', '#54A0FF', '#5F27CD', '#341F97', '#EE5A24']
  };

  static generateTagBasedFractal(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    return this.generateHtmlDnaHelix(features, params);
  }

  private static createTagSignatures(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): Record<string, TagSignature> {
    const signatures: Record<string, TagSignature> = {};

    Object.keys(features.tagCounts).forEach(tag => {
      const count = features.tagCounts[tag];
      const shape = (this.tagShapeMap[tag] || 'circle') as TagSignature['shape'];
      const colorScheme = this.getColorSchemeForTag(tag);
      const colorIndex = this.hashCode(tag + params.colorSeed) % colorScheme.length;

      signatures[tag] = {
        shape,
        color: new THREE.Color(colorScheme[colorIndex]),
        size: Math.log(count + 1) * 0.5 + 0.2,
        rotation: (this.hashCode(tag) % 360) * Math.PI / 180,
        depth: features.domComplexity.avgNestingLevel,
        connections: Math.min(count, 10)
      };
    });

    return signatures;
  }

  private static createTagGeometry(
    tag: string,
    count: number,
    signature: TagSignature,
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();

    const basePosition = this.calculateTagPosition(tag, features);
    const instances = Math.min(count, params.iterations / 2);

    for (let i = 0; i < instances; i++) {
      const geometry = this.createShapeGeometry(signature.shape, signature.size);
      const material = new THREE.MeshPhongMaterial({
        color: signature.color,
        emissive: signature.color,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.8 - (i * 0.05),
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);

      const angle = (i / instances) * Math.PI * 2;
      const radius = signature.size * (i + 1) * 0.8;

      mesh.position.set(
        basePosition.x + Math.cos(angle) * radius,
        basePosition.y + (i * signature.size * 0.3),
        basePosition.z + Math.sin(angle) * radius
      );

      mesh.rotation.set(
        signature.rotation + (i * 0.1),
        signature.rotation * 1.5 + (i * 0.15),
        signature.rotation * 0.5
      );

      mesh.scale.setScalar(1 - (i * 0.05));

      group.add(mesh);

      if (i > 0 && signature.connections > 0) {
        const lineGeometry = new THREE.BufferGeometry();
        const lineVertices = [
          basePosition.x + Math.cos(angle) * radius * 0.5,
          basePosition.y + ((i - 1) * signature.size * 0.3),
          basePosition.z + Math.sin(angle) * radius * 0.5,
          mesh.position.x,
          mesh.position.y,
          mesh.position.z
        ];

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
        const lineMaterial = new THREE.LineBasicMaterial({
          color: signature.color,
          opacity: 0.3,
          transparent: true
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
      }
    }

    return group;
  }

  private static createShapeGeometry(shape: string, size: number): THREE.BufferGeometry {
    switch (shape) {
      case 'circle':
        return new THREE.CircleGeometry(size, 32);

      case 'triangle':
        return new THREE.ConeGeometry(size, size * 1.5, 3);

      case 'square':
        return new THREE.BoxGeometry(size, size, size * 0.2);

      case 'hexagon':
        return new THREE.CylinderGeometry(size, size, size * 0.3, 6);

      case 'star':
        return this.createStarGeometry(size);

      case 'spiral':
        return this.createSpiralGeometry(size);

      case 'wave':
        return this.createWaveGeometry(size);

      default:
        return new THREE.SphereGeometry(size, 16, 16);
    }
  }

  private static createStarGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }

    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }

  private static createSpiralGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const spirals = 3;
    const points = 50;

    for (let s = 0; s < spirals; s++) {
      const offset = (s / spirals) * Math.PI * 2;
      for (let i = 0; i < points; i++) {
        const t = (i / points) * Math.PI * 4;
        const r = size * (i / points);
        const x = Math.cos(t + offset) * r;
        const y = Math.sin(t + offset) * r;
        const z = (i / points) * size * 0.5;
        vertices.push(x, y, z);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }

  private static createWaveGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const segments = 50;

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * size * 4;
      const y = Math.sin((i / segments) * Math.PI * 4) * size * 0.5;
      const z = 0;
      vertices.push(x, y, z);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }

  static generateFlowField(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    return this.generateCrystalGrowth(features, params);
  }

  static generateNetworkGraph(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();
    const nodes: THREE.Vector3[] = [];
    const nodeTypes: string[] = [];

    Object.entries(features.tagCounts).forEach(([tag, count], index) => {
      const nodeCount = Math.min(count, 5);
      for (let i = 0; i < nodeCount; i++) {
        const pos = this.calculateNodePosition(index, i, features);
        nodes.push(pos);
        nodeTypes.push(tag);
      }
    });

    nodes.forEach((node, i) => {
      const tag = nodeTypes[i];
      const signature = this.getNodeSignature(tag, features, params);

      const geometry = new THREE.SphereGeometry(signature.size, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: signature.color,
        emissive: signature.color,
        emissiveIntensity: 0.3
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node);
      group.add(mesh);

      const connections = Math.min(3, nodes.length - i - 1);
      for (let j = 1; j <= connections; j++) {
        const targetIndex = (i + j) % nodes.length;
        const lineGeometry = new THREE.BufferGeometry();
        const lineVertices = [
          node.x, node.y, node.z,
          nodes[targetIndex].x, nodes[targetIndex].y, nodes[targetIndex].z
        ];

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
          color: signature.color,
          opacity: 0.3,
          transparent: true
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
      }
    });

    return group;
  }

  static generateGeometricMandala(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();
    const layers = Math.min(features.semanticStructure.semanticTags.length + 3, 8);

    for (let layer = 0; layer < layers; layer++) {
      const radius = (layer + 1) * 3;
      const segments = 6 + layer * 2;
      const tag = features.semanticStructure.semanticTags[layer] || 'div';
      const color = this.getColorForTag(tag, params.colorSeed);

      const geometry = new THREE.RingGeometry(
        radius - 0.5,
        radius,
        segments,
        1
      );

      const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7 - (layer * 0.08)
      });

      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.z = (layer * Math.PI) / segments;

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const shapeSize = 0.5 + (layer * 0.2);

        const shapeGeometry = this.createShapeGeometry(
          this.tagShapeMap[tag] || 'circle',
          shapeSize
        );

        const shapeMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.2
        });

        const shape = new THREE.Mesh(shapeGeometry, shapeMaterial);
        shape.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          layer * 0.5
        );
        shape.rotation.z = angle;

        group.add(shape);
      }

      group.add(ring);
    }

    return group;
  }

  static generateParticleCloud(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    const particleCount = Math.min(
      features.domComplexity.totalElements * 10,
      params.iterations * 50
    );

    const tagArray = Object.keys(features.tagCounts);

    for (let i = 0; i < particleCount; i++) {
      const tag = tagArray[i % tagArray.length];
      const tagInfluence = features.tagCounts[tag] / features.domComplexity.totalElements;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 10 + Math.random() * 20 * tagInfluence;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions.push(x, y, z);

      const color = this.getColorForTag(tag, params.colorSeed + i);
      colors.push(color.r, color.g, color.b);

      sizes.push(0.1 + tagInfluence * 2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8
    });

    return new THREE.Points(geometry, material);
  }

  private static calculateTagPosition(tag: string, features: HTMLFeatures): THREE.Vector3 {
    const hash = this.hashCode(tag);
    const complexity = features.domComplexity.avgNestingLevel;

    const x = ((hash % 100) - 50) * 0.3;
    const y = ((hash % 73) - 36) * 0.3 * complexity;
    const z = ((hash % 47) - 23) * 0.3;

    return new THREE.Vector3(x, y, z);
  }

  private static calculateNodePosition(
    tagIndex: number,
    nodeIndex: number,
    features: HTMLFeatures
  ): THREE.Vector3 {
    const angle = (tagIndex / Object.keys(features.tagCounts).length) * Math.PI * 2;
    const radius = 10 + nodeIndex * 3;
    const height = (nodeIndex - 2) * 2;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
  }

  private static getNodeSignature(
    tag: string,
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): { size: number; color: THREE.Color } {
    const count = features.tagCounts[tag] || 1;
    const size = Math.log(count + 1) * 0.3 + 0.5;
    const color = this.getColorForTag(tag, params.colorSeed);

    return { size, color };
  }

  private static getColorSchemeForTag(tag: string): string[] {
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'em', 'strong'].includes(tag)) {
      return this.colorSchemes.text;
    }
    if (['header', 'nav', 'footer', 'aside'].includes(tag)) {
      return this.colorSchemes.navigation;
    }
    if (['button', 'input', 'select', 'textarea', 'form', 'label'].includes(tag)) {
      return this.colorSchemes.interactive;
    }
    if (['img', 'video', 'audio', 'canvas', 'svg', 'picture'].includes(tag)) {
      return this.colorSchemes.media;
    }
    if (['section', 'article', 'main', 'div'].includes(tag)) {
      return this.colorSchemes.structural;
    }
    return this.colorSchemes.semantic;
  }

  private static getColorForTag(tag: string, seed: number): THREE.Color {
    const scheme = this.getColorSchemeForTag(tag);
    const index = Math.abs(this.hashCode(tag + seed)) % scheme.length;
    return new THREE.Color(scheme[index]);
  }

  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    return this.lerp(w,
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
      ),
      this.lerp(v,
        this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }

  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private static grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private static p: number[] = (() => {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(Math.random() * 256);
    }
    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i];
    }
    return p;
  })();

  static generateHtmlDnaHelix(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();

    const tagTypes = Object.keys(features.tagCounts);
    const helixCount = Math.min(tagTypes.length, 8);
    const totalHeight = 20;
    const baseRadius = 8;

    for (let helixIndex = 0; helixIndex < helixCount; helixIndex++) {
      const tag = tagTypes[helixIndex];
      const count = features.tagCounts[tag];

      if (count === 0) continue;

      const radius = baseRadius + helixIndex * 2;
      const points = Math.min(count * 5, 200);
      const color = this.getColorForTag(tag, params.colorSeed + helixIndex * 50);

      const helixGeometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const colors: number[] = [];

      for (let i = 0; i < points; i++) {
        const t = i / points;
        const angle = t * Math.PI * 8 + helixIndex * Math.PI / 4;
        const height = t * totalHeight - totalHeight / 2;

        const x = Math.cos(angle) * radius * (1 + Math.sin(t * Math.PI * 6) * 0.3);
        const y = height;
        const z = Math.sin(angle) * radius * (1 + Math.cos(t * Math.PI * 4) * 0.3);

        vertices.push(x, y, z);
        colors.push(color.r, color.g, color.b);

        // Create connecting bridges between helixes
        if (helixIndex > 0 && i % 10 === 0) {
          const prevRadius = baseRadius + (helixIndex - 1) * 2;
          const prevX = Math.cos(angle) * prevRadius;
          const prevZ = Math.sin(angle) * prevRadius;

          const bridgeGeometry = new THREE.BufferGeometry();
          const bridgeVertices = [x, y, z, prevX, y, prevZ];
          bridgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bridgeVertices, 3));

          const bridgeMaterial = new THREE.LineBasicMaterial({
            color: color,
            opacity: 0.4,
            transparent: true
          });

          const bridge = new THREE.Line(bridgeGeometry, bridgeMaterial);
          group.add(bridge);
        }
      }

      helixGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      helixGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      // Create glowing tubes
      const tubePoints = [];
      for (let i = 0; i < vertices.length; i += 3) {
        tubePoints.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
      }

      if (tubePoints.length > 1) {
        const curve = new THREE.CatmullRomCurve3(tubePoints);
        const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.3, 8, false);
        const tubeMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.7
        });

        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        group.add(tube);
      }

      // Add spiral nucleotide markers
      for (let i = 0; i < points; i += 15) {
        const t = i / points;
        const angle = t * Math.PI * 8 + helixIndex * Math.PI / 4;
        const height = t * totalHeight - totalHeight / 2;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const nucleotideGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const nucleotideMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.5
        });

        const nucleotide = new THREE.Mesh(nucleotideGeometry, nucleotideMaterial);
        nucleotide.position.set(x, height, z);
        group.add(nucleotide);
      }
    }

    return group;
  }

  static generateCrystalGrowth(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();

    const complexity = features.domComplexity.totalElements;
    const crystalCount = Math.min(Math.floor(complexity / 20), 12);
    const baseColors = this.colorSchemes.structural;

    for (let crystalIndex = 0; crystalIndex < crystalCount; crystalIndex++) {
      const angle = (crystalIndex / crystalCount) * Math.PI * 2;
      const distance = 8 + Math.random() * 8;
      const centerX = Math.cos(angle) * distance;
      const centerZ = Math.sin(angle) * distance;

      const color = new THREE.Color(baseColors[crystalIndex % baseColors.length]);
      const branches = 6 + Math.floor(Math.random() * 6);

      // Central crystal core
      const coreGeometry = new THREE.OctahedronGeometry(2);
      const coreMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8
      });

      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.set(centerX, 0, centerZ);
      group.add(core);

      // Growing crystal branches
      for (let branch = 0; branch < branches; branch++) {
        const branchAngle = (branch / branches) * Math.PI * 2;
        const segments = 8 + Math.floor(Math.random() * 8);

        let currentX = centerX;
        let currentY = 0;
        let currentZ = centerZ;

        for (let segmentIndex = 0; segmentIndex < segments; segmentIndex++) {
          const progress = segmentIndex / segments;
          const size = 1.5 * (1 - progress * 0.8);

          // Add some randomness to growth direction
          const noise = this.noise3D(currentX * 0.1, currentY * 0.1, currentZ * 0.1);
          const growthX = Math.cos(branchAngle + noise * 0.5) * 1.5;
          const growthY = 0.8 + Math.sin(progress * Math.PI * 4) * 0.4;
          const growthZ = Math.sin(branchAngle + noise * 0.5) * 1.5;

          currentX += growthX;
          currentY += growthY;
          currentZ += growthZ;

          // Create crystal segment
          const segmentGeometry = new THREE.OctahedronGeometry(size);
          const segmentMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2 * (1 - progress * 0.5),
            transparent: true,
            opacity: 0.7 - progress * 0.3
          });

          const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
          segmentMesh.position.set(currentX, currentY, currentZ);
          segmentMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );

          group.add(segmentMesh);

          // Add connecting crystalline structures
          if (segmentIndex > 0) {
            const prevX = currentX - growthX;
            const prevY = currentY - growthY;
            const prevZ = currentZ - growthZ;

            const connectionGeometry = new THREE.CylinderGeometry(0.1, 0.2, size * 1.5);
            const connectionMaterial = new THREE.MeshPhongMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 0.3,
              transparent: true,
              opacity: 0.5
            });

            const connection = new THREE.Mesh(connectionGeometry, connectionMaterial);
            connection.position.set(
              (currentX + prevX) / 2,
              (currentY + prevY) / 2,
              (currentZ + prevZ) / 2
            );

            // Orient the connection
            const direction = new THREE.Vector3(
              currentX - prevX,
              currentY - prevY,
              currentZ - prevZ
            ).normalize();

            connection.lookAt(
              connection.position.x + direction.x,
              connection.position.y + direction.y,
              connection.position.z + direction.z
            );

            group.add(connection);
          }

          // Create fractal sub-branches
          if (segmentIndex % 3 === 0 && segmentIndex < segments - 2) {
            const subBranches = 2 + Math.floor(Math.random() * 3);

            for (let subBranch = 0; subBranch < subBranches; subBranch++) {
              const subAngle = (subBranch / subBranches) * Math.PI * 2;
              const subSize = size * 0.6;

              const subX = currentX + Math.cos(subAngle) * 2;
              const subY = currentY + Math.sin(subAngle) * 1;
              const subZ = currentZ + Math.sin(subAngle) * 2;

              const subGeometry = new THREE.TetrahedronGeometry(subSize);
              const subMaterial = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0.6
              });

              const subCrystal = new THREE.Mesh(subGeometry, subMaterial);
              subCrystal.position.set(subX, subY, subZ);
              group.add(subCrystal);
            }
          }
        }
      }
    }

    return group;
  }

  static generateLivingNeuralNetwork(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();

    const complexity = features.domComplexity.totalElements;
    const nodeCount = Math.min(Math.floor(complexity / 15), 80);
    const nodes: { position: THREE.Vector3; connections: number[]; activity: number; color: THREE.Color }[] = [];

    // Create neural nodes based on HTML structure
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 8 + Math.random() * 12;
      const height = (Math.random() - 0.5) * 15;

      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      const tagTypes = Object.keys(features.tagCounts);
      const tag = tagTypes[i % tagTypes.length];
      const color = this.getColorForTag(tag, params.colorSeed + i * 30);

      nodes.push({
        position,
        connections: [],
        activity: Math.random(),
        color
      });
    }

    // Create neural connections
    for (let i = 0; i < nodes.length; i++) {
      const maxConnections = 3 + Math.floor(Math.random() * 4);

      for (let j = 0; j < maxConnections; j++) {
        const targetIndex = Math.floor(Math.random() * nodes.length);
        if (targetIndex !== i && !nodes[i].connections.includes(targetIndex)) {
          nodes[i].connections.push(targetIndex);
        }
      }
    }

    // Create animated neural network
    nodes.forEach((node, nodeIndex) => {
      // Create pulsing node
      const nodeGeometry = new THREE.SphereGeometry(0.8, 16, 16);
      const nodeMaterial = new THREE.MeshPhongMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      });

      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.position.copy(node.position);

      // Add pulsing animation data
      (nodeMesh as any).userData = {
        originalScale: 1,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
        activity: node.activity,
        baseColor: node.color.clone()
      };

      group.add(nodeMesh);

      // Create connections with flowing particles
      node.connections.forEach(targetIndex => {
        if (targetIndex < nodes.length) {
          const target = nodes[targetIndex];

          // Create connection line
          const connectionGeometry = new THREE.BufferGeometry();
          const points = [node.position.clone(), target.position.clone()];
          connectionGeometry.setFromPoints(points);

          const connectionMaterial = new THREE.LineBasicMaterial({
            color: node.color,
            opacity: 0.3,
            transparent: true,
            linewidth: 2
          });

          const connection = new THREE.Line(connectionGeometry, connectionMaterial);
          group.add(connection);

          // Create flowing signal particles
          const particleCount = 3 + Math.floor(Math.random() * 5);
          for (let p = 0; p < particleCount; p++) {
            const particleGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({
              color: node.color,
              transparent: true,
              opacity: 0.8
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Add flowing animation data
            (particle as any).userData = {
              startPos: node.position.clone(),
              endPos: target.position.clone(),
              progress: Math.random(),
              speed: 0.008 + Math.random() * 0.015,
              size: 0.15 + Math.random() * 0.1
            };

            group.add(particle);
          }
        }
      });
    });

    // Add neural activity waves
    const waveCount = 8;
    for (let w = 0; w < waveCount; w++) {
      const waveGeometry = new THREE.RingGeometry(5 + w * 2, 5.5 + w * 2, 32);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: this.colorSchemes.semantic[w % this.colorSchemes.semantic.length],
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });

      const wave = new THREE.Mesh(waveGeometry, waveMaterial);
      wave.rotation.x = Math.PI / 2;

      // Add wave animation data
      (wave as any).userData = {
        originalScale: 1,
        waveSpeed: 0.01 + w * 0.002,
        wavePhase: w * Math.PI / 4
      };

      group.add(wave);
    }

    return group;
  }

  static generateSpiderWebDimension(
    features: HTMLFeatures,
    params: DynamicFractalParams
  ): THREE.Object3D {
    const group = new THREE.Group();

    const complexity = features.domComplexity.totalElements;
    const webLayers = Math.min(Math.floor(complexity / 25), 8);

    for (let layer = 0; layer < webLayers; layer++) {
      const radius = 6 + layer * 3;
      const spokes = 8 + layer * 2;
      const rings = 5 + layer;

      const layerColor = new THREE.Color(this.colorSchemes.navigation[layer % this.colorSchemes.navigation.length]);

      // Create radial spokes
      for (let spokeIndex = 0; spokeIndex < spokes; spokeIndex++) {
        const angle = (spokeIndex / spokes) * Math.PI * 2;
        const spokeGeometry = new THREE.BufferGeometry();

        const spokePoints = [];
        for (let r = 0; r <= rings; r++) {
          const currentRadius = (radius * r) / rings;
          const x = Math.cos(angle) * currentRadius;
          const z = Math.sin(angle) * currentRadius;
          const y = Math.sin(r * 0.5) * (layer * 0.8);
          spokePoints.push(new THREE.Vector3(x, y, z));
        }

        spokeGeometry.setFromPoints(spokePoints);

        const spokeMaterial = new THREE.LineBasicMaterial({
          color: layerColor,
          transparent: true,
          opacity: 0.7 - layer * 0.08
        });

        const spokeLine = new THREE.Line(spokeGeometry, spokeMaterial);
        group.add(spokeLine);
      }

      // Create concentric rings
      for (let ring = 1; ring <= rings; ring++) {
        const ringRadius = (radius * ring) / rings;
        const ringGeometry = new THREE.RingGeometry(ringRadius - 0.1, ringRadius + 0.1, spokes);

        const ringMaterial = new THREE.MeshBasicMaterial({
          color: layerColor,
          transparent: true,
          opacity: 0.4 - layer * 0.04,
          side: THREE.DoubleSide
        });

        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = Math.sin(ring * 0.5) * (layer * 0.8);

        group.add(ringMesh);
      }

      // Add animated dewdrops
      const dewdrops = Math.floor(spokes * rings * 0.3);
      for (let d = 0; d < dewdrops; d++) {
        const spoke = Math.floor(Math.random() * spokes);
        const ring = 1 + Math.floor(Math.random() * (rings - 1));

        const angle = (spoke / spokes) * Math.PI * 2;
        const currentRadius = (radius * ring) / rings;

        const x = Math.cos(angle) * currentRadius;
        const z = Math.sin(angle) * currentRadius;
        const y = Math.sin(ring * 0.5) * (layer * 0.8);

        const dewdropGeometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 8);
        const dewdropMaterial = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
          emissive: layerColor,
          emissiveIntensity: 0.2
        });

        const dewdrop = new THREE.Mesh(dewdropGeometry, dewdropMaterial);
        dewdrop.position.set(x, y, z);

        // Add shimmering animation data
        (dewdrop as any).userData = {
          shimmerSpeed: 0.02 + Math.random() * 0.03,
          shimmerPhase: Math.random() * Math.PI * 2,
          originalOpacity: 0.8
        };

        group.add(dewdrop);
      }

      // Add flying insects/particles
      const insects = Math.floor(6 + Math.random() * 8);
      for (let i = 0; i < insects; i++) {
        const insectGeometry = new THREE.SphereGeometry(0.1, 6, 6);
        const insectMaterial = new THREE.MeshPhongMaterial({
          color: layerColor,
          emissive: layerColor,
          emissiveIntensity: 0.5
        });

        const insect = new THREE.Mesh(insectGeometry, insectMaterial);

        // Random starting position around the web
        const startAngle = Math.random() * Math.PI * 2;
        const startRadius = radius * 0.5 + Math.random() * radius * 0.5;
        insect.position.set(
          Math.cos(startAngle) * startRadius,
          (Math.random() - 0.5) * 10,
          Math.sin(startAngle) * startRadius
        );

        // Add flying animation data
        (insect as any).userData = {
          flySpeed: 0.01 + Math.random() * 0.02,
          flyRadius: startRadius,
          flyAngle: startAngle,
          flyHeight: insect.position.y,
          bobSpeed: 0.03 + Math.random() * 0.02,
          bobPhase: Math.random() * Math.PI * 2
        };

        group.add(insect);
      }
    }

    // Add central spider
    const spiderGeometry = new THREE.SphereGeometry(1, 12, 12);
    const spiderMaterial = new THREE.MeshPhongMaterial({
      color: 0x330000,
      emissive: 0x110000,
      emissiveIntensity: 0.3
    });

    const spider = new THREE.Mesh(spiderGeometry, spiderMaterial);
    spider.position.set(0, 0, 0);

    // Add spider legs
    for (let leg = 0; leg < 8; leg++) {
      const legAngle = (leg / 8) * Math.PI * 2;
      const legGeometry = new THREE.CylinderGeometry(0.05, 0.1, 2);
      const legMaterial = new THREE.MeshPhongMaterial({
        color: 0x220000,
        emissive: 0x110000,
        emissiveIntensity: 0.2
      });

      const legMesh = new THREE.Mesh(legGeometry, legMaterial);
      legMesh.position.set(
        Math.cos(legAngle) * 1.5,
        0,
        Math.sin(legAngle) * 1.5
      );
      legMesh.rotation.z = legAngle;

      spider.add(legMesh);
    }

    group.add(spider);

    return group;
  }
}