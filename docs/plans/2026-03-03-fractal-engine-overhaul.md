# Fractal Engine Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the fractal engine for stunning visuals, true page-based variation, and high performance.

**Architecture:** Fix the broken animation loop, replace hundreds of individual draw calls with instanced/buffered geometry, add two new mathematically-correct fractal modes (Julia Set and L-System Tree), and wire a SeededRNG throughout so every website produces a uniquely different fractal.

**Tech Stack:** TypeScript, Three.js 0.161.0, Chrome Extension MV3, React 18, Webpack

---

## Background & Root Causes

Before touching any code, understand these four systemic issues:

### 1. Broken Animation Loop (`optimizedGenerator.ts:331-361`)
`startOptimizedAnimation()` only rotates the top-level group. All the `userData` set in `dynamicAlgorithms.ts` (pulseSpeed, flySpeed, shimmerSpeed, particle progress/startPos/endPos) is **never read**. Particles never flow. Nodes never pulse. The userData is dead weight.

### 2. Catastrophic Draw Call Count
- **Neural Network:** Creates individual `THREE.Mesh` (SphereGeometry) for every signal particle — potentially 400-1400 meshes per mode. One Points system would be 1 draw call.
- **Crystal Growth:** Creates individual meshes per crystal segment: ~12 crystals × 14 branches × 16 segments × 3 meshes = ~8000 draw calls. Points + InstancedMesh cores brings this to ~15.

### 3. No Page-Based Variation
`Math.random()` is called throughout `dynamicAlgorithms.ts`. Two different websites get the same fractal shape for the same mode. The `structuralHash` is computed but only weakly used as a color seed — not as an RNG seed. Fix: `SeededRNG(structuralHash + urlHash)` everywhere.

### 4. No True Mathematical Fractals
All 5 modes are 3D geometric arrangements, not fractals. Adding a Julia Set point cloud and an L-System recursive tree gives the extension genuine mathematical credibility.

---

## Task 1: Add SeededRNG to `dynamicAlgorithms.ts`

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` (add before the class, lines 1-22)

**Purpose:** Every `Math.random()` call in the algorithms will be replaced with `rng.next()` seeded from the page. This makes the fractal deterministic per page and unique per page.

**Step 1: Add the SeededRNG class at the top of the file (after imports, before the class)**

```typescript
class SeededRNG {
  private s: number;
  constructor(seed: number) {
    this.s = (seed ^ 0x9e3779b9) >>> 0 || 1;
  }
  next(): number {
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    return (this.s >>> 0) / 4294967295;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}
```

**Step 2: Add a private static helper to the class for computing the page seed**

Add this as the first private static method in `DynamicFractalAlgorithms`:

```typescript
private static pageSeed(features: HTMLFeatures, params: DynamicFractalParams): number {
  const h = parseInt(features.structuralHash, 36) || 12345;
  return Math.abs((h ^ params.colorSeed) >>> 0);
}
```

**Step 3: Verify the file compiles**

```bash
cd C:\Users\Abeelha\Documents\github\fractal-it
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors from the new class.

**Step 4: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "feat: add SeededRNG for deterministic page-based fractal variation"
```

---

## Task 2: Fix `generateCrystalGrowth` — Replace ~8000 Meshes with Points + InstancedMesh

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — replace `generateCrystalGrowth` method (lines 670-815)

**Purpose:** Current code creates up to 8000 individual mesh objects. Replacing with InstancedMesh for cores and a single Points cloud for all branch particles reduces this to ~15 draw calls.

**Step 1: Rewrite `generateCrystalGrowth` completely**

Replace the entire method body with:

```typescript
static generateCrystalGrowth(
  features: HTMLFeatures,
  params: DynamicFractalParams
): THREE.Object3D {
  const group = new THREE.Group();
  const rng = new SeededRNG(this.pageSeed(features, params) + 100);

  const complexity = features.domComplexity.totalElements;
  const crystalCount = Math.min(Math.floor(complexity / 20) + 3, 12);
  const baseColors = this.colorSchemes.structural;

  // All branch point positions and colors — batched into one Points object
  const branchPositions: number[] = [];
  const branchColors: number[] = [];

  // Core octahedrons via InstancedMesh (one draw call)
  const coreGeo = new THREE.OctahedronGeometry(2);
  const coreMat = new THREE.MeshPhongMaterial({
    transparent: true,
    opacity: 0.85
  });
  const coreInstances = new THREE.InstancedMesh(coreGeo, coreMat, crystalCount);
  const matrix = new THREE.Matrix4();

  for (let ci = 0; ci < crystalCount; ci++) {
    const angle = (ci / crystalCount) * Math.PI * 2;
    const distance = rng.range(8, 16);
    const centerX = Math.cos(angle) * distance;
    const centerZ = Math.sin(angle) * distance;

    const color = new THREE.Color(baseColors[ci % baseColors.length]);

    // Use page color palette if available
    if (features.colorPalette[ci % features.colorPalette.length]) {
      try {
        const pageColor = new THREE.Color(features.colorPalette[ci % features.colorPalette.length]);
        const hsl = { h: 0, s: 0, l: 0 };
        pageColor.getHSL(hsl);
        if (hsl.s > 0.2) color.copy(pageColor.setHSL(hsl.h, Math.max(hsl.s, 0.6), Math.max(hsl.l, 0.45)));
      } catch (_) { /* keep default */ }
    }

    matrix.setPosition(centerX, 0, centerZ);
    coreInstances.setMatrixAt(ci, matrix);
    coreInstances.setColorAt(ci, color);

    // Generate branch points (no meshes — just positions for the Points cloud)
    const branches = rng.int(5, 10);
    for (let b = 0; b < branches; b++) {
      const branchAngle = (b / branches) * Math.PI * 2;
      const segments = rng.int(6, 12);
      let cx = centerX, cy = 0, cz = centerZ;

      for (let s = 0; s < segments; s++) {
        const progress = s / segments;
        const noise = this.noise3D(cx * 0.1, cy * 0.1, cz * 0.1);
        cx += Math.cos(branchAngle + noise * 0.6) * rng.range(0.8, 1.8);
        cy += rng.range(0.5, 1.2) + Math.sin(progress * Math.PI * 4) * 0.3;
        cz += Math.sin(branchAngle + noise * 0.6) * rng.range(0.8, 1.8);

        branchPositions.push(cx, cy, cz);
        branchColors.push(color.r, color.g, color.b);

        // Sub-branch points every 3rd segment
        if (s % 3 === 0 && s < segments - 2) {
          const subs = rng.int(2, 4);
          for (let sb = 0; sb < subs; sb++) {
            const sa = (sb / subs) * Math.PI * 2;
            branchPositions.push(cx + Math.cos(sa) * rng.range(0.5, 1.5), cy + rng.range(0.2, 0.8), cz + Math.sin(sa) * rng.range(0.5, 1.5));
            branchColors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8);
          }
        }
      }
    }
  }

  coreInstances.instanceMatrix.needsUpdate = true;
  if (coreInstances.instanceColor) coreInstances.instanceColor.needsUpdate = true;
  group.add(coreInstances);

  // One Points draw call for all crystal branches
  if (branchPositions.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(branchPositions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(branchColors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      sizeAttenuation: true
    }));
    group.add(pts);
  }

  return group;
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "perf: replace crystal growth ~8000 meshes with InstancedMesh + Points (~15 draw calls)"
```

---

## Task 3: Fix `generateLivingNeuralNetwork` — Replace Particle Meshes with Points System

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — replace `generateLivingNeuralNetwork` method (lines 817-961)

**Purpose:** The current code creates an individual `THREE.Mesh(SphereGeometry)` for each signal particle (3-7 particles per connection, 3-4 connections per node, ~80 nodes = up to 1400 individual meshes). Replacing with a single `THREE.Points` reduces this to 1 draw call. The particle positions are stored in userData and updated by the animation loop (Task 5).

**Step 1: Rewrite `generateLivingNeuralNetwork` completely**

```typescript
static generateLivingNeuralNetwork(
  features: HTMLFeatures,
  params: DynamicFractalParams
): THREE.Object3D {
  const group = new THREE.Group();
  const rng = new SeededRNG(this.pageSeed(features, params) + 200);

  const complexity = features.domComplexity.totalElements;
  const nodeCount = Math.min(Math.floor(complexity / 15) + 8, 60);
  const tagTypes = Object.keys(features.tagCounts);

  // Build node positions and colors
  const nodes: { position: THREE.Vector3; connections: number[]; activity: number; color: THREE.Color }[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2;
    const radius = rng.range(8, 20);
    const height = rng.range(-7, 7);

    const tag = tagTypes[i % tagTypes.length];
    const color = this.getColorForTag(tag, params.colorSeed + i * 30);

    nodes.push({
      position: new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ),
      connections: [],
      activity: rng.next(),
      color
    });
  }

  // Assign connections
  for (let i = 0; i < nodes.length; i++) {
    const maxConnections = rng.int(2, 5);
    for (let j = 0; j < maxConnections; j++) {
      const target = rng.int(0, nodes.length - 1);
      if (target !== i && !nodes[i].connections.includes(target)) {
        nodes[i].connections.push(target);
      }
    }
  }

  // Collect all particle data (will be one Points object)
  interface ParticleData {
    sx: number; sy: number; sz: number;
    ex: number; ey: number; ez: number;
    progress: number; speed: number;
  }
  const allParticles: ParticleData[] = [];
  const particleColors: number[] = [];

  // Create node meshes + connection lines
  nodes.forEach((node, ni) => {
    // Pulsing sphere for each node (kept as individual mesh — there are only ~60)
    const nodeGeo = new THREE.SphereGeometry(0.7, 10, 10);
    const nodeMat = new THREE.MeshPhongMaterial({
      color: node.color,
      emissive: node.color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    nodeMesh.position.copy(node.position);
    nodeMesh.userData = {
      pulseSpeed: rng.range(0.4, 1.2),
      pulsePhase: rng.next() * Math.PI * 2,
      activity: node.activity
    };
    group.add(nodeMesh);

    // Connection lines
    node.connections.forEach(targetIdx => {
      if (targetIdx >= nodes.length) return;
      const target = nodes[targetIdx];

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        node.position.clone(),
        target.position.clone()
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.2
      });
      group.add(new THREE.Line(lineGeo, lineMat));

      // Collect particle data for this connection
      const pCount = rng.int(2, 4);
      for (let p = 0; p < pCount; p++) {
        allParticles.push({
          sx: node.position.x,
          sy: node.position.y,
          sz: node.position.z,
          ex: target.position.x,
          ey: target.position.y,
          ez: target.position.z,
          progress: rng.next(),
          speed: rng.range(0.006, 0.018)
        });
        particleColors.push(node.color.r, node.color.g, node.color.b);
      }
    });
  });

  // Single Points object for ALL particles — animated by the animation loop
  if (allParticles.length > 0) {
    const positions = new Float32Array(allParticles.length * 3);
    allParticles.forEach((p, i) => {
      positions[i * 3]     = p.sx + (p.ex - p.sx) * p.progress;
      positions[i * 3 + 1] = p.sy + (p.ey - p.sy) * p.progress;
      positions[i * 3 + 2] = p.sz + (p.ez - p.sz) * p.progress;
    });

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

    const particleSys = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    }));

    // Animation loop reads this userData to update positions each frame
    particleSys.userData = {
      type: 'neuralParticles',
      particles: allParticles,
      positions
    };
    group.add(particleSys);
  }

  // Ambient wave rings (keep existing — they look good, animate via userData)
  for (let w = 0; w < 6; w++) {
    const waveGeo = new THREE.RingGeometry(5 + w * 3, 5.5 + w * 3, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: this.colorSchemes.semantic[w % this.colorSchemes.semantic.length],
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = Math.PI / 2;
    wave.userData = {
      waveSpeed: 0.25 + w * 0.05,
      wavePhase: w * Math.PI / 3
    };
    group.add(wave);
  }

  return group;
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors.

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "perf: replace neural network particle meshes with single Points system (~1400 -> 1 draw call)"
```

---

## Task 4: Fix `generateHtmlDnaHelix` — InstancedMesh for Nucleotides + Seeded RNG

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — replace `generateHtmlDnaHelix` (lines 563-668)

**Purpose:** Current code creates individual sphere meshes per nucleotide marker. Use InstancedMesh with per-instance color. Also replace the redundant line-then-tube creation with just tubes and batch bridge lines into one LineSegments geometry. Use seeded RNG.

**Step 1: Rewrite `generateHtmlDnaHelix`**

```typescript
static generateHtmlDnaHelix(
  features: HTMLFeatures,
  params: DynamicFractalParams
): THREE.Object3D {
  const group = new THREE.Group();
  const rng = new SeededRNG(this.pageSeed(features, params) + 300);

  const tagTypes = Object.keys(features.tagCounts);
  const helixCount = Math.min(tagTypes.length, 8);
  const totalHeight = 22;
  const baseRadius = 7;

  // Collect all nucleotide positions + colors for InstancedMesh
  const nucleotidePositions: THREE.Vector3[] = [];
  const nucleotideColors: THREE.Color[] = [];

  // Collect all bridge line vertices for one LineSegments geometry
  const bridgeVertices: number[] = [];
  const bridgeColors: number[] = [];

  for (let hi = 0; hi < helixCount; hi++) {
    const tag = tagTypes[hi];
    const count = features.tagCounts[tag];
    if (!count) continue;

    const radius = baseRadius + hi * 2.2;
    const points = Math.min(count * 5, 180);
    const color = this.getColorForTag(tag, params.colorSeed + hi * 50);

    // Use page color palette for first helixes if available
    if (hi < features.colorPalette.length) {
      try {
        const pc = new THREE.Color(features.colorPalette[hi]);
        const hsl = { h: 0, s: 0, l: 0 };
        pc.getHSL(hsl);
        if (hsl.s > 0.15) color.setHSL(hsl.h, Math.max(hsl.s, 0.7), Math.max(hsl.l, 0.45));
      } catch (_) { /* keep */ }
    }

    // Build helix tube
    const tubePoints: THREE.Vector3[] = [];
    for (let i = 0; i < points; i++) {
      const t = i / points;
      const angle = t * Math.PI * 8 + hi * Math.PI / 4;
      const height = t * totalHeight - totalHeight / 2;
      tubePoints.push(new THREE.Vector3(
        Math.cos(angle) * radius * (1 + Math.sin(t * Math.PI * 6) * 0.25),
        height,
        Math.sin(angle) * radius * (1 + Math.cos(t * Math.PI * 4) * 0.25)
      ));
    }

    if (tubePoints.length > 1) {
      const curve = new THREE.CatmullRomCurve3(tubePoints);
      const tubeMat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.72
      });
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.28, 7, false), tubeMat));
    }

    // Collect nucleotide positions
    for (let i = 0; i < points; i += 14) {
      const t = i / points;
      const angle = t * Math.PI * 8 + hi * Math.PI / 4;
      const height = t * totalHeight - totalHeight / 2;
      nucleotidePositions.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ));
      nucleotideColors.push(color.clone());
    }

    // Collect bridge line vertices (cross-strand connections)
    if (hi > 0) {
      const prevRadius = baseRadius + (hi - 1) * 2.2;
      for (let i = 0; i < points; i += 10) {
        const t = i / points;
        const angle = t * Math.PI * 8 + hi * Math.PI / 4;
        const height = t * totalHeight - totalHeight / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const px = Math.cos(angle) * prevRadius;
        const pz = Math.sin(angle) * prevRadius;

        bridgeVertices.push(x, height, z, px, height, pz);
        bridgeColors.push(color.r, color.g, color.b, color.r * 0.6, color.g * 0.6, color.b * 0.6);
      }
    }
  }

  // One InstancedMesh for ALL nucleotide spheres
  if (nucleotidePositions.length > 0) {
    const nucleotideGeo = new THREE.SphereGeometry(0.45, 8, 8);
    const nucleotideMat = new THREE.MeshPhongMaterial({
      emissiveIntensity: 0.55,
      transparent: false
    });
    const instances = new THREE.InstancedMesh(nucleotideGeo, nucleotideMat, nucleotidePositions.length);
    const mat4 = new THREE.Matrix4();
    nucleotidePositions.forEach((pos, i) => {
      mat4.setPosition(pos);
      instances.setMatrixAt(i, mat4);
      instances.setColorAt(i, nucleotideColors[i]);
    });
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    group.add(instances);
  }

  // One LineSegments draw call for all bridge cross-strands
  if (bridgeVertices.length > 0) {
    const bridgeGeo = new THREE.BufferGeometry();
    bridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bridgeVertices, 3));
    bridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(bridgeColors, 3));
    group.add(new THREE.LineSegments(bridgeGeo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4
    })));
  }

  return group;
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "perf: DNA helix uses InstancedMesh for nucleotides + batched LineSegments for bridges"
```

---

## Task 5: Fix the Animation Loop in `optimizedGenerator.ts`

**Files:**
- Modify: `src/fractal/optimizedGenerator.ts` — replace `startOptimizedAnimation` method (lines 323-362)

**Purpose:** This is the most critical fix. Currently all per-object animation data in `userData` is dead weight. The new loop traverses all children and applies time-based animations, making particles flow, nodes pulse, insects fly, dewdrops shimmer, and wave rings breathe.

**Step 1: Replace `startOptimizedAnimation` completely**

```typescript
private startOptimizedAnimation(): void {
  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
  }

  let lastFrameTime = performance.now();
  let frameCount = 0;

  const animate = () => {
    this.animationId = requestAnimationFrame(animate);

    const now = performance.now();
    const t = now * 0.001; // seconds
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;

    frameCount++;
    if (frameCount % 60 === 0) {
      this.performanceMonitor.fps = Math.round(1000 / deltaTime);
      this.performanceMonitor.frameTime = deltaTime;
      if (this.performanceMonitor.fps < 30) this.reduceQuality();
    }

    const rotSpeed = Math.min(0.004, 60 / Math.max(this.performanceMonitor.fps, 1) * 0.004);

    this.currentMeshes.forEach((group, gi) => {
      // Slow global rotation of the whole fractal
      group.rotation.y += rotSpeed * (1 + gi * 0.08);

      // Per-child animations driven by userData
      group.traverse(child => {
        const ud = child.userData;
        if (!ud) return;

        // ── Neural particle system ──────────────────────────────────
        if (ud.type === 'neuralParticles') {
          const pts = child as THREE.Points;
          const particles = ud.particles as Array<{
            sx: number; sy: number; sz: number;
            ex: number; ey: number; ez: number;
            progress: number; speed: number;
          }>;
          const pos = ud.positions as Float32Array;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.progress = (p.progress + p.speed) % 1;
            const i3 = i * 3;
            pos[i3]     = p.sx + (p.ex - p.sx) * p.progress;
            pos[i3 + 1] = p.sy + (p.ey - p.sy) * p.progress;
            pos[i3 + 2] = p.sz + (p.ez - p.sz) * p.progress;
          }
          pts.geometry.attributes.position.needsUpdate = true;
          return;
        }

        // ── Pulsing nodes (neural network) ──────────────────────────
        if (ud.pulseSpeed !== undefined) {
          const s = 1 + Math.sin(t * ud.pulseSpeed * Math.PI * 2 + (ud.pulsePhase || 0)) * 0.28 * (ud.activity || 0.5);
          child.scale.setScalar(Math.max(0.05, s));
        }

        // ── Flying insects (spider web) ─────────────────────────────
        if (ud.flySpeed !== undefined) {
          ud.flyAngle = ((ud.flyAngle as number) || 0) + (ud.flySpeed as number);
          child.position.x = Math.cos(ud.flyAngle) * (ud.flyRadius as number);
          child.position.z = Math.sin(ud.flyAngle) * (ud.flyRadius as number);
          child.position.y = (ud.flyHeight as number) + Math.sin(t * (ud.bobSpeed as number) + (ud.bobPhase as number)) * 2;
        }

        // ── Shimmering dewdrops (spider web) ────────────────────────
        if (ud.shimmerSpeed !== undefined && child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshPhongMaterial;
          if (mat?.transparent) {
            mat.opacity = (ud.originalOpacity as number) *
              (0.3 + 0.7 * Math.abs(Math.sin(t * (ud.shimmerSpeed as number) * Math.PI * 2 + (ud.shimmerPhase as number))));
          }
        }

        // ── Breathing wave rings (neural network) ───────────────────
        if (ud.waveSpeed !== undefined) {
          const sc = 1 + Math.sin(t * (ud.waveSpeed as number) * Math.PI * 2 + (ud.wavePhase || 0)) * 0.1;
          child.scale.setScalar(Math.max(0.05, sc));
        }
      });
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  animate();
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/optimizedGenerator.ts
git commit -m "fix: animation loop now traverses children and applies all userData-driven animations"
```

---

## Task 6: Add URL-Based Seeding to `optimizedGenerator.ts`

**Files:**
- Modify: `src/fractal/optimizedGenerator.ts` — replace `hashCode` method (lines 517-525)

**Purpose:** Include the page URL in the color seed so two different websites with structurally similar HTML still get uniquely different fractals.

**Step 1: Replace `hashCode` with URL-aware version**

```typescript
private hashCode(str: string): number {
  let hash = 0;
  // Include URL for extra per-page variation
  if (typeof window !== 'undefined') {
    const url = window.location.href;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash) + url.charCodeAt(i);
      hash = hash & hash;
    }
  }
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/optimizedGenerator.ts
git commit -m "feat: include page URL in fractal seed for unique variation per website"
```

---

## Task 7: Add Julia Set Cloud Mode to `dynamicAlgorithms.ts`

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — add new static method at end of class

**Purpose:** A genuine mathematical fractal. The Julia set constant `c` is derived from the page's structural hash, so every website gets a uniquely shaped Julia set. The 2D set is extruded into 3D by using the smooth iteration count as the Z axis, creating a dramatic 3D terrain.

**Step 1: Add `generateJuliaSetCloud` method before the closing `}` of the class**

```typescript
static generateJuliaSetCloud(
  features: HTMLFeatures,
  params: DynamicFractalParams
): THREE.Object3D {
  const group = new THREE.Group();
  const seed = params.colorSeed;

  // Page-specific Julia constant — maps hash to visually interesting ranges
  // Re(c): -0.85 to 0.35 | Im(c): -0.35 to 0.35
  const re = -0.85 + ((seed % 1200) / 1000);
  const im = -0.35 + ((Math.floor(seed / 1200) % 700) / 1000);

  const resolution = 150; // 150x150 = 22500 points — fast enough, looks good
  const maxIter = 96;
  const positions: number[] = [];
  const colors: number[] = [];

  // Dominant hue from page color palette (if available)
  let baseHue = (seed % 360) / 360;
  if (features.colorPalette.length > 0) {
    try {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(features.colorPalette[0]).getHSL(hsl);
      if (hsl.s > 0.1) baseHue = hsl.h;
    } catch (_) { /* keep default */ }
  }

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x0 = (i / resolution - 0.5) * 3.5;
      const y0 = (j / resolution - 0.5) * 3.5;
      let x = x0, y = y0;
      let iter = 0;

      while (x * x + y * y < 4 && iter < maxIter) {
        const xn = x * x - y * y + re;
        y = 2 * x * y + im;
        x = xn;
        iter++;
      }

      // Only render boundary points (escaped but not too quickly)
      if (iter > 1 && iter < maxIter) {
        // Smooth coloring to eliminate iteration banding
        const logMod = Math.log(x * x + y * y) / 2;
        const smoothIter = Math.max(0, iter + 1 - Math.log(logMod) / Math.log(2));
        const t = Math.min(1, smoothIter / maxIter);

        // Z-extrusion: iteration depth creates 3D relief
        const z = (t - 0.5) * 18 + Math.sin(x0 * 2.5) * 1.5;

        positions.push(x0 * 8, y0 * 8, z);

        const hue = (baseHue + t * 0.55) % 1;
        const color = new THREE.Color().setHSL(hue, 0.9, 0.35 + t * 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }
  }

  if (positions.length === 0) {
    // Fallback for degenerate c values: simple spiral
    for (let i = 0; i < 5000; i++) {
      const t = i / 5000;
      const angle = t * Math.PI * 20;
      positions.push(Math.cos(angle) * t * 10, t * 15 - 7.5, Math.sin(angle) * t * 10);
      const c = new THREE.Color().setHSL((baseHue + t * 0.5) % 1, 0.9, 0.5);
      colors.push(c.r, c.g, c.b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  group.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    sizeAttenuation: true
  })));

  // Thin axis rings to frame the fractal
  for (let r = 0; r < 3; r++) {
    const ringGeo = new THREE.RingGeometry(8 + r * 4, 8.15 + r * 4, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL((baseHue + r * 0.15) % 1, 0.8, 0.5),
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.userData = { waveSpeed: 0.15 + r * 0.05, wavePhase: r * Math.PI / 1.5 };
    group.add(ring);
  }

  return group;
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "feat: add Julia Set 3D cloud mode — mathematical fractal with page-specific c parameter"
```

---

## Task 8: Add L-System Recursive Fractal Tree Mode to `dynamicAlgorithms.ts`

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — add new static method

**Purpose:** A proper recursive fractal tree where branch angle, branching factor, and depth all come from page features (nesting depth → tree depth, interactive element count → branching angle, etc.). The entire tree is one `LineSegments` draw call.

**Step 1: Add `generateLSystemTree` method before the closing `}` of the class**

```typescript
static generateLSystemTree(
  features: HTMLFeatures,
  params: DynamicFractalParams
): THREE.Object3D {
  const group = new THREE.Group();
  const rng = new SeededRNG(this.pageSeed(features, params) + 500);

  // Map page features to tree parameters
  const depth = Math.min(Math.max(features.semanticStructure.nestingDepth, 3), 6);
  const branchAngle = (18 + rng.range(0, 25)) * Math.PI / 180;
  const scaleRatio = rng.range(0.58, 0.72);
  const numBranches = features.contentMetrics.linkCount > 20 ? 3 : 2;

  interface Branch {
    start: THREE.Vector3;
    end: THREE.Vector3;
    depth: number;
  }
  const branches: Branch[] = [];

  const grow = (
    start: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    currentDepth: number
  ) => {
    if (currentDepth === 0 || length < 0.15) return;

    const end = start.clone().add(dir.clone().multiplyScalar(length));
    branches.push({ start, end, depth: currentDepth });

    for (let b = 0; b < numBranches; b++) {
      const spreadAngle = ((b / numBranches) - 0.5) * Math.PI * 0.9 + rng.range(-0.1, 0.1);
      const tiltAngle = branchAngle + rng.range(-0.12, 0.12);

      const newDir = dir.clone();
      newDir.applyAxisAngle(
        new THREE.Vector3(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize(),
        tiltAngle
      );
      newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
      newDir.normalize();

      grow(end, newDir, length * scaleRatio, currentDepth - 1);
    }
  };

  grow(
    new THREE.Vector3(0, -9, 0),
    new THREE.Vector3(0, 1, 0),
    4.5,
    depth
  );

  // Batch everything into one LineSegments draw call
  const positions: number[] = [];
  const colors: number[] = [];

  // Base hue from page
  let baseHue = (params.colorSeed % 360) / 360;
  if (features.colorPalette.length > 0) {
    try {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(features.colorPalette[0]).getHSL(hsl);
      if (hsl.s > 0.1) baseHue = hsl.h;
    } catch (_) { /* keep */ }
  }

  branches.forEach(branch => {
    const t = branch.depth / depth; // 1 = trunk, 0 = tips
    const hue = (baseHue + (1 - t) * 0.35) % 1;
    const lightness = 0.3 + (1 - t) * 0.45;
    const c = new THREE.Color().setHSL(hue, 0.85, lightness);

    positions.push(
      branch.start.x, branch.start.y, branch.start.z,
      branch.end.x, branch.end.y, branch.end.z
    );
    colors.push(c.r, c.g, c.b, c.r * 0.75, c.g * 0.75, c.b * 0.75);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  })));

  // Particle cloud at branch tips (adds sparkle to the tips)
  const tipPositions: number[] = [];
  const tipColors: number[] = [];
  branches
    .filter(b => b.depth === 1)
    .forEach(b => {
      const hue = (baseHue + 0.35) % 1;
      const c = new THREE.Color().setHSL(hue, 1, 0.7);
      // A small cluster around each tip
      for (let i = 0; i < 4; i++) {
        tipPositions.push(
          b.end.x + rng.range(-0.4, 0.4),
          b.end.y + rng.range(-0.4, 0.4),
          b.end.z + rng.range(-0.4, 0.4)
        );
        tipColors.push(c.r, c.g, c.b);
      }
    });

  if (tipPositions.length > 0) {
    const tipGeo = new THREE.BufferGeometry();
    tipGeo.setAttribute('position', new THREE.Float32BufferAttribute(tipPositions, 3));
    tipGeo.setAttribute('color', new THREE.Float32BufferAttribute(tipColors, 3));
    group.add(new THREE.Points(tipGeo, new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    })));
  }

  return group;
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "feat: add L-System recursive fractal tree mode — page-seeded branch parameters"
```

---

## Task 9: Wire New Modes into `optimizedGenerator.ts`

**Files:**
- Modify: `src/fractal/optimizedGenerator.ts`
  - `modes` array (lines 41-77) — add 2 new entries
  - `generateFractalByMode` switch statement (lines 215-233) — add 2 new cases

**Purpose:** Register the two new modes so the extension knows about them and can dispatch to them.

**Step 1: Add new entries to the `modes` array**

After the `mandala` entry (after line 76), add:

```typescript
{
  id: 'julia-set',
  name: 'Julia Set Cloud',
  description: 'Mathematical fractal — unique shape per website',
  algorithm: 'juliaSet',
  performance: 'fast'
},
{
  id: 'l-system',
  name: 'Fractal Tree',
  description: 'Recursive L-System tree from page structure',
  algorithm: 'lSystem',
  performance: 'ultra-fast'
}
```

**Step 2: Add new cases to the `switch` in `generateFractalByMode`**

Before the `default:` case, add:

```typescript
case 'juliaSet':
  return DynamicFractalAlgorithms.generateJuliaSetCloud(this.features, params);

case 'lSystem':
  return DynamicFractalAlgorithms.generateLSystemTree(this.features, params);
```

**Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 4: Commit**

```bash
git add src/fractal/optimizedGenerator.ts
git commit -m "feat: register julia-set and l-system modes in OptimizedFractalGenerator"
```

---

## Task 10: Add New Presets to `EnhancedPopup.tsx`

**Files:**
- Modify: `src/popup/components/EnhancedPopup.tsx` — `presets` object (lines 88-124)

**Purpose:** Expose the two new fractal modes in the popup UI so users can select them.

**Step 1: Add two new preset entries to the `presets` object**

After the `'mandala'` entry, add:

```typescript
'julia-set': {
  name: '🌀 Julia Set Cloud',
  description: 'Mathematical fractal unique to this page',
  mode: 'julia-set',
  performance: 'high',
  settings: { quality: 'medium' as const, animation: true }
},
'l-system': {
  name: '🌿 Fractal Tree',
  description: 'Recursive tree from page structure',
  mode: 'l-system',
  performance: 'high',
  settings: { quality: 'medium' as const, animation: true }
}
```

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

Expected: all 7 presets appear in the popup grid.

**Step 3: Commit**

```bash
git add src/popup/components/EnhancedPopup.tsx
git commit -m "feat: add Julia Set and Fractal Tree presets to popup UI"
```

---

## Task 11: Fix `generateSpiderWebDimension` — Seeded RNG + Remove Extra Spider Meshes

**Files:**
- Modify: `src/fractal/dynamicAlgorithms.ts` — `generateSpiderWebDimension` method (lines 963-1129)

**Purpose:** Replace all `Math.random()` calls with seeded RNG. The spider's 8 legs are independent meshes that could be batched, but the bigger win is that consistent seeding makes the web shape reproducible per page.

**Step 1: Add seeded RNG to the method — replace `Math.random()` calls**

Find and replace each occurrence in the method:

| Old | New (add `const rng = new SeededRNG(this.pageSeed(features, params) + 400);` at top of method body, then replace:) |
|-----|-----|
| `Math.random() * 8` | `rng.range(0, 8)` |
| `Math.random() * 3` | `rng.range(0, 3)` |
| `Math.floor(Math.random() * 8)` | `rng.int(0, 7)` |
| `Math.floor(Math.random() * (rings - 1))` | `rng.int(0, rings - 2)` |
| `Math.random() * 0.3` | `rng.range(0, 0.3)` |
| `Math.floor(6 + Math.random() * 8)` | `rng.int(6, 14)` |
| `Math.random() * Math.PI * 2` | `rng.next() * Math.PI * 2` |
| `Math.random() * radius * 0.5` | `rng.range(0, radius * 0.5)` |
| `(Math.random() - 0.5) * 10` | `rng.range(-5, 5)` |

**Step 2: Build and verify**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/fractal/dynamicAlgorithms.ts
git commit -m "feat: seeded RNG in spider web — consistent shape per page"
```

---

## Task 12: Final Build, Load, and Manual Smoke Test

**Purpose:** Verify everything works end-to-end as a Chrome extension.

**Step 1: Full production-like build**

```bash
cd C:\Users\Abeelha\Documents\github\fractal-it
npm run build 2>&1
```

Expected: no errors, `dist/` folder populated.

**Step 2: Manual smoke test checklist**

Load the extension in Chrome (`chrome://extensions` → Load unpacked → select `dist/`):

- [ ] Open any website (e.g., github.com)
- [ ] Click extension icon → popup appears with 7 presets
- [ ] Select "Julia Set Cloud" → click Execute Fractal → Julia set renders
- [ ] Select "Fractal Tree" → switch mode → L-system tree renders
- [ ] Select "Living Neural Network" → verify signal particles flow (not static)
- [ ] Select "Spider Web Dimension" → verify dewdrops shimmer and insects fly
- [ ] Select "Crystal Growth" → verify it renders without lag
- [ ] Open a different website → same mode looks different (page variation)
- [ ] FPS counter shows 50+ on a mid-range machine
- [ ] Press ESC → closes cleanly
- [ ] Re-open same mode → renders correctly

**Step 3: Commit final state**

```bash
git add -A
git commit -m "chore: full overhaul complete — better fractals, perf, page variation"
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/fractal/dynamicAlgorithms.ts` | +SeededRNG, +Julia Set, +L-System, fix neural network particles, fix crystal growth, fix DNA helix, fix spider web |
| `src/fractal/optimizedGenerator.ts` | Fix animation loop, +2 modes, URL-based seeding |
| `src/popup/components/EnhancedPopup.tsx` | +2 presets (Julia Set, Fractal Tree) |

## Performance Improvement Summary

| Mode | Before (draw calls) | After (draw calls) |
|------|--------------------|--------------------|
| Crystal Growth | ~8000 | ~15 |
| Neural Network | ~1400 | ~100 (nodes) + 1 (particles) |
| DNA Helix | ~272 | ~20 |
| Julia Set (new) | n/a | 1 |
| L-System Tree (new) | n/a | 2 |
