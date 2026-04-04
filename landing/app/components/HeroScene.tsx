"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG_COLOR = "#06080f";
const AMBER = "#d4944c";
const TEAL = "#5eead4";
const WHITE = "#ffffff";

// ─── Shared curve (module-level singleton avoids per-frame allocation) ────────
const TUNNEL_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 10),
    new THREE.Vector3(0.4, 0.2, 6),
    new THREE.Vector3(-0.3, -0.1, 2),
    new THREE.Vector3(0.2, 0.3, -2),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, -14),
  ],
  false,
  "catmullrom",
  0.5
);

// ─── Tunnel ───────────────────────────────────────────────────────────────────

function Tunnel() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(TUNNEL_CURVE, 120, 1.4, 8, false),
    []
  );

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity =
        0.18 + Math.sin(clock.elapsedTime * 1.2) * 0.06;
    }
  });

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        ref={matRef}
        color={AMBER}
        wireframe
        transparent
        opacity={0.18}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ─── Ring gates ───────────────────────────────────────────────────────────────

interface RingProps {
  position: [number, number, number];
  delay: number;
}

function RingGate({ position, delay }: RingProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + delay;
    if (!meshRef.current) return;
    meshRef.current.rotation.z = t * 0.18;
    meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.6 + Math.sin(t * 1.6) * 0.4;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[1.1, 0.028, 12, 80]} />
      <meshStandardMaterial
        ref={matRef}
        color={TEAL}
        emissive={TEAL}
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </mesh>
  );
}

const RING_GATES: Array<{ position: [number, number, number]; delay: number }> =
  [
    { position: [0.35, 0.15, 4.0], delay: 0.0 },
    { position: [-0.2, -0.08, 1.8], delay: 1.1 },
    { position: [0.15, 0.22, -0.4], delay: 2.3 },
    { position: [-0.1, 0.05, -2.6], delay: 0.7 },
    { position: [0.08, -0.12, -4.8], delay: 1.8 },
    { position: [0.0, 0.0, -7.0], delay: 3.2 },
  ];

function RingGates() {
  return (
    <>
      {RING_GATES.map((g, i) => (
        <RingGate key={i} position={g.position} delay={g.delay} />
      ))}
    </>
  );
}

// ─── Flowing particles ────────────────────────────────────────────────────────

const PARTICLE_COUNT = 420;

const PALETTE = [
  new THREE.Color(AMBER),
  new THREE.Color(TEAL),
  new THREE.Color(WHITE),
  new THREE.Color(AMBER).lerp(new THREE.Color(WHITE), 0.5),
];

function FlowingParticles() {
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, colors, speeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT; // evenly spaced initial distribution
      const point = TUNNEL_CURVE.getPoint(t);
      const radius = Math.random() * 1.0;
      const angle = Math.random() * Math.PI * 2;

      pos[i * 3] = point.x + Math.cos(angle) * radius * 0.65;
      pos[i * 3 + 1] = point.y + Math.sin(angle) * radius * 0.65;
      pos[i * 3 + 2] = point.z;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      // Each particle gets a slightly different speed for organic variance
      spd[i] = 0.018 + Math.random() * 0.032;
    }

    return { positions: pos, colors: col, speeds: spd };
  }, []);

  // Per-particle normalized progress along the curve [0..1]
  // Initialised spread across the full curve so no visible "pop-in"
  const progress = useRef<Float32Array>(null!);
  if (!progress.current) {
    const arr = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i] = i / PARTICLE_COUNT;
    }
    progress.current = arr;
  }

  // Reusable Vector3 to avoid per-frame allocations
  const _tmp = useRef(new THREE.Vector3());

  useFrame(() => {
    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const prog = progress.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Advance progress; particles flow from back (t=1) toward front (t=0)
      prog[i] += speeds[i] * 0.004;
      if (prog[i] > 1) prog[i] -= 1;

      // t=0 is the viewer end, t=1 is the far end; invert so flow comes toward viewer
      const t = 1 - prog[i];
      TUNNEL_CURVE.getPoint(t, _tmp.current);

      // Spiral offset to keep particles near but not on the centreline
      const angle =
        (i / PARTICLE_COUNT) * Math.PI * 2 + prog[i] * Math.PI * 6;
      const r = 0.08 + (i % 7) * 0.04; // deterministic radius variance

      posArr[i * 3] = _tmp.current.x + Math.cos(angle) * r;
      posArr[i * 3 + 1] = _tmp.current.y + Math.sin(angle) * r;
      posArr[i * 3 + 2] = _tmp.current.z;
    }

    posAttr.needsUpdate = true;
  });

  // Create a Three.js BufferGeometry imperatively so we own the BufferAttributes
  // directly — this is safer than relying on JSX <bufferAttribute> args syntax
  // which changed between R3F minor versions.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.028}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

// ─── Scene lighting ───────────────────────────────────────────────────────────

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight
        position={[0, 0, 4]}
        color={AMBER}
        intensity={1.2}
        distance={12}
      />
      <pointLight
        position={[0, 0, -5]}
        color={TEAL}
        intensity={0.8}
        distance={14}
      />
    </>
  );
}

// ─── Camera rig with mouse parallax ──────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();

  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef(new THREE.Vector3(0, 0, 5));
  const current = useRef(new THREE.Vector3(0, 0, 5));

  const onMouseMove = useCallback((e: MouseEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // Parallax tilt driven by mouse + slow organic float
    target.current.x =
      mouse.current.x * 0.22 + Math.sin(t * 0.18) * 0.06;
    target.current.y =
      mouse.current.y * 0.14 + Math.cos(t * 0.22) * 0.04;
    target.current.z = 5 + Math.sin(t * 0.1) * 0.08;

    // Ease toward target (damping factor keeps motion silky smooth)
    current.current.lerp(target.current, 0.035);
    camera.position.copy(current.current);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Post-processing ──────────────────────────────────────────────────────────

function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.4}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  );
}

// ─── Scene root ───────────────────────────────────────────────────────────────

function Scene() {
  return (
    <>
      <color attach="background" args={[BG_COLOR]} />
      <SceneLighting />
      <Tunnel />
      <RingGates />
      <FlowingParticles />
      <CameraRig />
      <PostFX />
    </>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true, alpha: false }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Scene />
    </Canvas>
  );
}
