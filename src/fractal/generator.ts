import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function getHtmlFeatures(html: string) {
  const tagCounts: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(html))) {
    const tag = match[1].toLowerCase();
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    const classAttr = /class\s*=\s*"([^"]*)"/.exec(match[2]);
    if (classAttr && classAttr[1]) {
      classAttr[1].split(/\s+/).forEach((cls) => {
        if (cls) classCounts[cls] = (classCounts[cls] || 0) + 1;
      });
    }
  }
  return { tagCounts, classCounts };
}

let controls: OrbitControls | null = null;
let currentMeshes: THREE.Object3D[] = [];
let currentScene: THREE.Scene | null = null;
let currentCamera: THREE.PerspectiveCamera | null = null;
let currentRenderer: THREE.WebGLRenderer | null = null;

export function generateFractal(
  html: string,
  sections = { header: true, footer: true, body: true, section: true },
): HTMLCanvasElement {
  const hash = hashString(html);
  const params = generateFractalParams(hash);
  const { tagCounts, classCounts } = getHtmlFeatures(html);
  const tagList = Object.keys(tagCounts);
  const classList = Object.keys(classCounts);
  const tagInfluence = tagList.length;
  const classInfluence = classList.length;
  const headerCount = tagCounts["header"] || 0;
  const footerCount = tagCounts["footer"] || 0;
  const sectionCount = tagCounts["section"] || 0;
  const bodyCount = tagCounts["body"] || 0;
  const navCount = tagCounts["nav"] || 0;
  const divCount = tagCounts["div"] || 0;
  const aCount = tagCounts["a"] || 0;
  const imgCount = tagCounts["img"] || 0;
  const uniqueClassCount = classList.length;

  if (currentRenderer) {
    currentMeshes.forEach((m) => currentScene?.remove(m));
    currentRenderer.dispose();
    currentMeshes = [];
    currentScene = null;
    currentCamera = null;
    currentRenderer = null;
    controls = null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setClearColor(0x000000, 1);
  renderer.setSize(window.innerWidth, window.innerHeight);

  let formula =
    (tagInfluence +
      classInfluence +
      headerCount +
      footerCount +
      navCount +
      sectionCount +
      divCount +
      aCount +
      imgCount) %
    5;

  let meshList: THREE.Object3D[] = [];

  if (sections.header && headerCount) {
    const mesh = makeSectionFractal(
      "header",
      params,
      tagCounts,
      classCounts,
      hash,
      0,
    );
    scene.add(mesh);
    meshList.push(mesh);
  }
  if (sections.footer && footerCount) {
    const mesh = makeSectionFractal(
      "footer",
      params,
      tagCounts,
      classCounts,
      hash,
      1,
    );
    scene.add(mesh);
    meshList.push(mesh);
  }
  if (sections.body && bodyCount) {
    const mesh = makeSectionFractal(
      "body",
      params,
      tagCounts,
      classCounts,
      hash,
      2,
    );
    scene.add(mesh);
    meshList.push(mesh);
  }
  if (sections.section && sectionCount) {
    const mesh = makeSectionFractal(
      "section",
      params,
      tagCounts,
      classCounts,
      hash,
      3,
    );
    scene.add(mesh);
    meshList.push(mesh);
  }
  if (meshList.length === 0) {
    const mesh = makeSectionFractal(
      "default",
      params,
      tagCounts,
      classCounts,
      hash,
      4,
    );
    scene.add(mesh);
    meshList.push(mesh);
  }

  camera.position.z = 40 + tagInfluence * 2;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 1;
  controls.maxDistance = 10000;

  function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer.render(scene, camera);
  }
  animate();

  currentMeshes = meshList;
  currentScene = scene;
  currentCamera = camera;
  currentRenderer = renderer;

  return renderer.domElement;
}

function makeSectionFractal(
  section: string,
  params: any,
  tagCounts: any,
  classCounts: any,
  hash: number,
  offset: number,
): THREE.Object3D {
  let geometry: THREE.BufferGeometry;
  let material: THREE.Material;
  let mesh: THREE.Object3D;
  const tagInfluence = Object.keys(tagCounts).length;
  const classInfluence = Object.keys(classCounts).length;
  const uniqueClassCount = Object.keys(classCounts).length;
  if (section === "header") {
    geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const spiralCount = 2 + ((tagCounts["header"] || 1) % 5);
    for (let i = 0; i < params.iterations / 2; i++) {
      const t =
        i * 0.07 +
        Math.sin(i * 0.01 + params.a + uniqueClassCount + offset) * spiralCount;
      const r =
        8 +
        Math.sin(i * 0.03 + params.b + tagInfluence + offset) *
          (4 + (tagInfluence % 6));
      const x = Math.sin(t) * r + offset * 5;
      const y = Math.cos(t) * r + offset * 5;
      const z =
        Math.sin(t * 0.5 + params.c + offset) * (4 + (tagInfluence % 3)) +
        Math.cos(i * 0.02) * (2 + (tagInfluence % 2));
      vertices.push(x, y, z);
      const color = new THREE.Color(
        `hsl(${
          (i * 360) / params.iterations + tagInfluence * 10 + offset * 30
        },100%,${60 - (classInfluence % 30)}%)`,
      );
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.6 + (tagInfluence % 5) * 0.1,
      sizeAttenuation: true,
    });
    mesh = new THREE.Points(geometry, material);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
    });
    const lineMesh = new THREE.Line(geometry, lineMaterial);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(lineMesh);

    return group;
  } else if (section === "footer") {
    geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    let x = 0.1,
      y = 0,
      z = 0;
    const sigma = 10 + (params.a % 10) + tagInfluence + offset;
    const rho = 28 + (params.b % 10) + classInfluence + offset;
    const beta = 8 / 3 + (params.c % 2) + (tagInfluence % 2) + offset;
    for (let i = 0; i < params.iterations / 2; i++) {
      const dt = 0.01;
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      x += dx;
      y += dy;
      z += dz;
      vertices.push(x, y, z);
      const color = new THREE.Color(
        `hsl(${
          (z * 30 + 180 + uniqueClassCount * 10 + offset * 30) % 360
        },100%,${50 - (tagInfluence % 20)}%)`,
      );
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.3 + (classInfluence % 3) * 0.1,
      sizeAttenuation: true,
    });
    mesh = new THREE.Points(geometry, material);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });
    const lineMesh = new THREE.Line(geometry, lineMaterial);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(lineMesh);

    return group;
  } else if (section === "body") {
    geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const A = 10 + (params.a % 5) + tagInfluence + offset;
    const B = 10 + (params.b % 5) + classInfluence + offset;
    const C = 10 + (params.c % 5) + tagInfluence + offset;
    const a = 3 + (params.a % 4) + tagInfluence + offset;
    const b = 2 + (params.b % 3) + classInfluence + offset;
    const c = 4 + (params.c % 5) + tagInfluence + offset;
    for (let i = 0; i < params.iterations / 2; i++) {
      const t = i * 0.02;
      const x = A * Math.sin(a * t + params.a);
      const y = B * Math.sin(b * t + params.b);
      const z = C * Math.sin(c * t + params.c);
      vertices.push(x, y, z);
      const color = new THREE.Color(
        `hsl(${(t * 60 + tagInfluence * 10 + offset * 30) % 360},100%,${
          70 - (classInfluence % 30)
        }%)`,
      );
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.4 + (tagInfluence % 4) * 0.2,
      sizeAttenuation: true,
    });
    mesh = new THREE.Points(geometry, material);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });
    const lineMesh = new THREE.Line(geometry, lineMaterial);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(lineMesh);

    return group;
  } else if (section === "section") {
    geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    function branch(
      x: number,
      y: number,
      z: number,
      len: number,
      angle: number,
      tilt: number,
      depth: number,
    ) {
      if (depth === 0 || len < 0.5) return;
      const nx = x + Math.cos(angle) * Math.cos(tilt) * len;
      const ny = y + Math.sin(angle) * Math.cos(tilt) * len;
      const nz = z + Math.sin(tilt) * len;
      vertices.push(x, y, z, nx, ny, nz);
      const color = new THREE.Color(
        `hsl(${
          (depth * 60 + len * 10 + tagInfluence * 10 + offset * 30) % 360
        },100%,${60 - (classInfluence % 30)}%)`,
      );
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      branch(
        nx,
        ny,
        nz,
        len * (0.7 + Math.random() * 0.2),
        angle + params.a * 0.2 + tagInfluence * 0.01,
        tilt + params.b * 0.2 + classInfluence * 0.01,
        depth - 1,
      );
      branch(
        nx,
        ny,
        nz,
        len * (0.7 + Math.random() * 0.2),
        angle - params.b * 0.2 - tagInfluence * 0.01,
        tilt - params.c * 0.2 - classInfluence * 0.01,
        depth - 1,
      );
      if (depth % 2 === 0) {
        branch(
          nx,
          ny,
          nz,
          len * (0.7 + Math.random() * 0.2),
          angle + params.c * 0.3 + tagInfluence * 0.01,
          tilt - params.d * 0.3 - tagInfluence * 0.01,
          depth - 1,
        );
      }
    }
    branch(
      0,
      0,
      0,
      10 + tagInfluence,
      Math.PI / 2,
      0,
      7 + (classInfluence % 4),
    );
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
    });
    mesh = new THREE.LineSegments(geometry, material);

    return mesh;
  } else {
    geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    let spiralIdx = 0;
    for (const cls of Object.keys(classCounts).slice(0, 8)) {
      for (
        let i = 0;
        i < params.iterations / (Object.keys(classCounts).length || 1);
        i++
      ) {
        const t = i * 0.09 + (spiralIdx * Math.PI) / 4;
        const r = 6 + Math.sin(i * 0.04 + spiralIdx) * 3;
        const x = Math.sin(t) * r + spiralIdx * 2;
        const y = Math.cos(t) * r + spiralIdx * 2;
        const z = Math.sin(t * 0.5 + spiralIdx) * 3 + Math.cos(i * 0.02) * 1.5;
        vertices.push(x, y, z);
        const color = new THREE.Color(
          `hsl(${(spiralIdx * 60 + (i * 360) / params.iterations) % 360},100%,${
            50 + ((spiralIdx * 5) % 40)
          }%)`,
        );
        colors.push(color.r, color.g, color.b);
      }
      spiralIdx++;
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
      vertexColors: true,
      size: 0.5 + (uniqueClassCount % 5) * 0.2,
      sizeAttenuation: true,
    });
    mesh = new THREE.Points(geometry, material);

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });
    const lineMesh = new THREE.Line(geometry, lineMaterial);

    const group = new THREE.Group();
    group.add(mesh);
    group.add(lineMesh);

    return group;
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateFractalParams(hash: number) {
  return {
    iterations: 800 + (hash % 2200),
    scale: 0.2 + (hash % 100) / 200,
    rotationSpeed: 0.003 + (hash % 100) / 10000,
    a: 1.5 + (hash % 10) / 5,
    b: 2.5 + (hash % 7) / 3,
    c: 1.2 + (hash % 5) / 2,
    d: 2.2 + (hash % 3) / 2,
  };
}

export function updateFractalSections(
  html: string,
  sections: {
    header: boolean;
    footer: boolean;
    body: boolean;
    section: boolean;
  },
) {
  if (
    currentRenderer &&
    currentRenderer.domElement &&
    currentRenderer.domElement.parentElement
  ) {
    const parent = currentRenderer.domElement.parentElement;
    parent.removeChild(currentRenderer.domElement);
    const canvas = generateFractal(html, sections);
    parent.appendChild(canvas);
  }
}
