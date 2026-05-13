// src/components/GlbViewer.jsx
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, useGLTF } from "@react-three/drei";
import api from "../../../../api/axiosAPI";

/** Resolve API-relative URL to absolute */
function toApiUrl(pathLike) {
    if (!pathLike) return "";
    try {
        const url = new URL(pathLike, api.defaults.baseURL).href;
        console.log(url);
        return url;
    } catch {
        return pathLike;
    }
}

/** Fetch with credentials and return a blob URL (works behind auth) */
function useBlobUrl(src) {
    const [blobUrl, setBlobUrl] = useState(null);
    useEffect(() => {
        let revoked = false;
        let currentUrl = null;
        async function run() {
            if (!src) return setBlobUrl(null);
            try {
                const res = await fetch(src, { credentials: "include" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                currentUrl = URL.createObjectURL(blob);
                if (!revoked) setBlobUrl(currentUrl);
            } catch (e) {
                console.error("3D fetch failed:", e);
                setBlobUrl(null);
            }
        }
        run();
        return () => {
            revoked = true;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
    }, [src]);
    return blobUrl;
}

function Model({ url }) {
    const { scene } = useGLTF(url, true);
    useEffect(() => {
        scene.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
            }
        });
    }, [scene]);
    return <primitive object={scene} />;
}

/** Free-fly controls (WASD/Arrows + Shift), mouse look on canvas click */
function FreeFlyControls({ accel = 50, maxSpeed = 18, damping = 10, fastMult = 3 }) {
    const { camera } = useThree();
    const keys = useRef({});
    const velocity = useRef(new THREE.Vector3());
    const direction = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());

    useEffect(() => {
        const down = (e) => (keys.current[e.code] = true);
        const up = (e) => (keys.current[e.code] = false);
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
    }, []);

    useFrame((_, dt) => {
        if (!dt) return;

        const speedBoost = keys.current["ShiftLeft"] || keys.current["ShiftRight"] ? fastMult : 1;

        camera.getWorldDirection(direction.current).normalize();
        right.current.crossVectors(direction.current, camera.up).normalize();

        const a = new THREE.Vector3();

        if (keys.current["KeyW"] || keys.current["ArrowUp"]) a.add(direction.current);
        if (keys.current["KeyS"] || keys.current["ArrowDown"]) a.addScaledVector(direction.current, -1);
        if (keys.current["KeyA"] || keys.current["ArrowLeft"]) a.addScaledVector(right.current, -1);
        if (keys.current["KeyD"] || keys.current["ArrowRight"]) a.add(right.current);

        if (a.lengthSq() > 0) a.normalize().multiplyScalar(accel * speedBoost);

        velocity.current.addScaledVector(a, dt);

        const vLen = velocity.current.length();
        const vMax = maxSpeed * speedBoost;
        if (vLen > vMax) velocity.current.multiplyScalar(vMax / vLen);

        const damp = Math.exp(-damping * dt);
        velocity.current.multiplyScalar(damp);

        camera.position.addScaledVector(velocity.current, dt);
    });

    return <PointerLockControls makeDefault selector="#viewer-canvas" />;
}

export default function GlbViewer({ plan }) {
    const src = useMemo(() => toApiUrl(plan?.asset_path), [plan?.asset_path]);
    const blobUrl = useBlobUrl(src);

    const [menu, setMenu] = useState(false);

    // UI state for controls
    const [bg, setBg] = useState("#87ceeb");
    const [ambient, setAmbient] = useState(0.8);
    const [dir, setDir] = useState(1.1);
    const [showGrid, setShowGrid] = useState(true);
    const [showAxes, setShowAxes] = useState(true);
    const [speed, setSpeed] = useState(60);     // affects accel
    const [maxSpeed, setMaxSpeed] = useState(22);

    if (!plan) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
                Niciun model 3D selectat.
            </div>
        );
    }
    if (!plan.asset_path) {
        return (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
                Lipsă <code>asset_path</code> pentru această lucrare 3D.
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <Canvas id="viewer-canvas" shadows camera={{ position: [4, 2, 6], fov: 60 }} dpr={[1, 2]}>
                <color attach="background" args={[bg]} />
                <ambientLight intensity={ambient} />
                <directionalLight position={[8, 10, 6]} intensity={dir} castShadow />

                <Suspense fallback={null}>
                    {blobUrl && <Model url={blobUrl} />}
                    <FreeFlyControls accel={speed} maxSpeed={maxSpeed} />
                </Suspense>

                {showGrid && <gridHelper args={[50, 50]} />}
                {showAxes && <axesHelper args={[2]} />}
            </Canvas>

            {/* Instructions overlay (click-through) */}
            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    padding: "6px 10px",
                    background: "rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                    borderRadius: 6,
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                Click în viewer pentru a controla camera • WASD/Săgeți • Shift pentru boost • Esc pentru a ieși
            </div>

            {/* Right-side control panel */}

            <button
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 260,
                    padding: 12,
                    background: "rgba(255,255,255,0.9)",
                    borderRadius: 10,
                    zIndex: 100,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 15,
                    color: "#111",
                    backdropFilter: "blur(4px)",
                }}
                onClick={() => setMenu(!menu)}
            >
                {menu ? "Ascunde meniu" : "Afișează meniu"}
            </button>

            <div
                style={{
                    position: "absolute",
                    top: 70,
                    right: 10,
                    width: 260,
                    opacity: menu ? 1 : 0,
                    padding: 12,
                    background: "rgba(255,255,255,0.9)",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                    color: "#111",
                    backdropFilter: "blur(4px)",
                }}
            >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Setări vizualizare</div>

                <label style={{ display: "block", margin: "8px 0 4px" }}>Background</label>
                <input
                    type="color"
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    style={{ width: "100%", height: 32, padding: 0, border: "1px solid #ddd", borderRadius: 6 }}
                />

                <label style={{ display: "block", margin: "10px 0 4px" }}>
                    Ambient light: <b>{ambient.toFixed(2)}</b>
                </label>
                <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={ambient}
                    onChange={(e) => setAmbient(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                />

                <label style={{ display: "block", margin: "10px 0 4px" }}>
                    Directional light: <b>{dir.toFixed(2)}</b>
                </label>
                <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.05}
                    value={dir}
                    onChange={(e) => setDir(parseFloat(e.target.value))}
                    style={{ width: "100%" }}
                />

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                        Grid
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} />
                        Axes
                    </label>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />

                <div style={{ fontWeight: 700, marginBottom: 8 }}>Mișcare cameră</div>

                <label style={{ display: "block", margin: "8px 0 4px" }}>
                    Accelerație: <b>{speed}</b>
                </label>
                <input
                    type="range"
                    min={10}
                    max={120}
                    step={1}
                    value={speed}
                    onChange={(e) => setSpeed(parseInt(e.target.value))}
                    style={{ width: "100%" }}
                />

                <label style={{ display: "block", margin: "8px 0 4px" }}>
                    Viteză maximă: <b>{maxSpeed}</b>
                </label>
                <input
                    type="range"
                    min={6}
                    max={60}
                    step={1}
                    value={maxSpeed}
                    onChange={(e) => setMaxSpeed(parseInt(e.target.value))}
                    style={{ width: "100%" }}
                />
            </div>
        </div>
    );
}