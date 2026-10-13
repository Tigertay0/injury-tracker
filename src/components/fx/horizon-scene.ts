// Three.js scene from "Horizon Hero Section" by lovesickfromthe6ix on 21st.dev:
// https://21st.dev/lovesickfromthe6ix/horizon-hero-section
// Star field, nebula, layered mountains, atmosphere and bloom are kept from the
// original. Changes: plain module (no React state), progress is passed in by the page,
// colors match PitchSafe, lighter on phones, seeded terrain, and a still mode.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface HorizonScene {
  /** 0 at the top of the intro, 1 at its end. */
  setProgress(progress: number): void;
  /** Pause rendering while the intro is off screen. */
  setActive(active: boolean): void;
  dispose(): void;
}

// Camera stops for the three intro scenes. The last stop is -420, not the original
// -700, so the camera stays inside the atmosphere and never turns to face it.
const NEBULA_OPACITY = 0.28;
// Glow of the sky dome. Seen from inside, its brightest point sits straight ahead of
// the camera, so it fades out as the camera flies forward.
const ATMOSPHERE_STRENGTH = 1;

const STOPS = [
  { x: 0, y: 30, z: 300 },
  { x: 0, y: 40, z: -50 },
  { x: 0, y: 50, z: -420 },
];

/** Small deterministic random so the mountains look the same on every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createHorizonScene(canvas: HTMLCanvasElement, { still }: { still: boolean }): HorizonScene {
  const small = window.innerWidth < 768;
  const rand = seeded(7);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.00025);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 20, 100);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  // Bloom is the expensive part; phones get the plain render
  let composer: EffectComposer | null = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85));
  }

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T) => {
    disposables.push(d);
    return d;
  };

  // --- Star field: three depth layers that rotate at different speeds ---
  const starCount = small ? 2200 : 5000;
  const stars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  for (let i = 0; i < 3; i++) {
    const geometry = track(new THREE.BufferGeometry());
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const color = new THREE.Color();
    for (let j = 0; j < starCount; j++) {
      const radius = 200 + rand() * 800;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(rand() * 2 - 1);
      positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[j * 3 + 2] = radius * Math.cos(phi);
      const pick = rand();
      if (pick < 0.7) color.setHSL(0, 0, 0.8 + rand() * 0.2);
      else if (pick < 0.9) color.setHSL(0.6, 0.5, 0.8);
      else color.setHSL(0.42, 0.5, 0.75);
      colors.set([color.r, color.g, color.b], j * 3);
      sizes[j] = rand() * 2 + 0.5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const material = track(
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, depth: { value: i } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float time;
          uniform float depth;
          void main() {
            vColor = color;
            vec3 pos = position;
            float angle = time * 0.05 * (1.0 - depth * 0.3);
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            pos.xy = rot * pos.xy;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
            gl_FragColor = vec4(vColor, opacity);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    stars.push(points);
  }

  // --- Nebula: a wide wavy plane far behind everything ---
  const nebulaMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x1d3fd6) },
        color2: { value: new THREE.Color(0x0b6e4f) },
        opacity: { value: NEBULA_OPACITY },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float time;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
          pos.z += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;
        void main() {
          float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
          vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
          float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
          alpha *= 1.0 + vElevation * 0.01;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const nebula = new THREE.Mesh(track(new THREE.PlaneGeometry(8000, 4000, small ? 50 : 100, small ? 50 : 100)), nebulaMaterial);
  nebula.position.z = -1050;
  scene.add(nebula);

  // --- Mountains: four silhouettes, nearest darkest ---
  const layers = [
    { distance: -50, height: 60, color: 0x0b1222, opacity: 1 },
    { distance: -100, height: 80, color: 0x111d3a, opacity: 0.8 },
    { distance: -150, height: 100, color: 0x14295a, opacity: 0.6 },
    { distance: -200, height: 120, color: 0x173a78, opacity: 0.4 },
  ];
  const mountains = layers.map((layer, index) => {
    const points: THREE.Vector2[] = [];
    const segments = 50;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * 1000;
      const y = Math.sin(i * 0.1) * layer.height + Math.sin(i * 0.05) * layer.height * 0.5 + rand() * layer.height * 0.2 - 100;
      points.push(new THREE.Vector2(x, y));
    }
    points.push(new THREE.Vector2(5000, -300), new THREE.Vector2(-5000, -300));
    const mesh = new THREE.Mesh(
      track(new THREE.ShapeGeometry(new THREE.Shape(points))),
      track(new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, side: THREE.DoubleSide })),
    );
    mesh.position.set(0, layer.distance, layer.distance);
    mesh.userData = { index };
    scene.add(mesh);
    return mesh;
  });

  // --- Atmosphere glow around everything ---
  const atmosphereMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, strength: { value: ATMOSPHERE_STRENGTH } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform float time;
        uniform float strength;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
          atmosphere *= sin(time * 2.0) * 0.1 + 0.9;
          gl_FragColor = vec4(atmosphere * strength, intensity * 0.25 * strength);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    }),
  );
  scene.add(new THREE.Mesh(track(new THREE.SphereGeometry(600, 32, 32)), atmosphereMaterial));

  // --- Camera: eased toward a target set by scroll progress ---
  const smooth = { x: 0, y: 30, z: 100 };
  const target = { ...STOPS[0] };

  const setProgress = (progress: number) => {
    const p = Math.min(Math.max(progress, 0), 1);
    const total = p * (STOPS.length - 1);
    const section = Math.min(Math.floor(total), STOPS.length - 2);
    const t = total - section;
    const a = STOPS[section];
    const b = STOPS[section + 1];
    target.x = a.x + (b.x - a.x) * t;
    target.y = a.y + (b.y - a.y) * t;
    target.z = a.z + (b.z - a.z) * t;
    // Past the ridges the mountains drop away and only the sky is left
    for (const m of mountains) m.visible = p < 0.7;
    // Dim the nebula as the camera closes in so bloom cannot white out the screen
    const fade = Math.min(Math.max((p - 0.5) / 0.3, 0), 1);
    nebulaMaterial.uniforms.opacity.value = NEBULA_OPACITY * (1 - fade * 0.5);
    atmosphereMaterial.uniforms.strength.value = ATMOSPHERE_STRENGTH * (1 - Math.min(Math.max((p - 0.3) / 0.4, 0), 1));
    if (still) renderFrame(performance.now());
  };

  const renderFrame = (now: number) => {
    const time = now * 0.001;
    for (const s of stars) s.material.uniforms.time.value = time;
    nebulaMaterial.uniforms.time.value = time * 0.5;
    atmosphereMaterial.uniforms.time.value = time;

    const ease = still ? 1 : 0.05;
    smooth.x += (target.x - smooth.x) * ease;
    smooth.y += (target.y - smooth.y) * ease;
    smooth.z += (target.z - smooth.z) * ease;
    const floatX = still ? 0 : Math.sin(time * 0.1) * 2;
    const floatY = still ? 0 : Math.cos(time * 0.15) * 1;
    camera.position.set(smooth.x + floatX, smooth.y + floatY, smooth.z);
    camera.lookAt(0, 10, -600);

    mountains.forEach((m, i) => {
      const parallax = 1 + i * 0.5;
      m.position.x = still ? 0 : Math.sin(time * 0.1) * 2 * parallax;
      m.position.y = 50 + (still ? 0 : Math.cos(time * 0.15) * parallax);
    });

    if (composer) composer.render();
    else renderer.render(scene, camera);
  };

  let frame = 0;
  let active = true;
  const loop = (now: number) => {
    renderFrame(now);
    if (active) frame = requestAnimationFrame(loop);
  };
  if (still) renderFrame(performance.now());
  else frame = requestAnimationFrame(loop);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer?.setSize(window.innerWidth, window.innerHeight);
    if (still) renderFrame(performance.now());
  };
  window.addEventListener('resize', onResize);

  return {
    setProgress,
    setActive(next) {
      if (still || next === active) return;
      active = next;
      cancelAnimationFrame(frame);
      if (active) frame = requestAnimationFrame(loop);
    },
    dispose() {
      active = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      for (const d of disposables) d.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
