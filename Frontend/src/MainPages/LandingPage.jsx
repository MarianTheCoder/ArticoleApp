import { useEffect, useRef } from "react";
import BalyLogo from "../assets/BalyLogo.png";

function BeamBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const beams = Array.from({ length: 22 }, (_, i) => ({
            x: (window.innerWidth / 22) * i + Math.random() * 60,
            width: 1.5 + Math.random() * 2.5,
            speed: 0.2 + Math.random() * 0.35,
            offset: Math.random() * Math.PI * 2,
            isBlue: Math.random() > 0.55,
            opacity: 0.55 + Math.random() * 0.4,
        }));

        let frame = 0;
        let animId;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#04060d";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Grid
            ctx.strokeStyle = "rgba(0,130,255,0.04)";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 55) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 55) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
            }

            beams.forEach((b) => {
                const pulse = Math.sin(frame * b.speed * 0.012 + b.offset);
                const alpha = b.opacity * (0.4 + 0.6 * Math.max(0, pulse));

                const r = b.isBlue ? 0 : 232;
                const g = b.isBlue ? 163 : 25;
                const bl = b.isBlue ? 255 : 44;

                // Core beam
                const grad = ctx.createLinearGradient(b.x, 0, b.x, canvas.height);
                grad.addColorStop(0, `rgba(${r},${g},${bl},0)`);
                grad.addColorStop(0.2, `rgba(${r},${g},${bl},${alpha * 0.3})`);
                grad.addColorStop(0.5, `rgba(${r},${g},${bl},${alpha})`);
                grad.addColorStop(0.8, `rgba(${r},${g},${bl},${alpha * 0.3})`);
                grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);

                ctx.beginPath();
                ctx.strokeStyle = grad;
                ctx.lineWidth = b.width;
                ctx.moveTo(b.x, 0); ctx.lineTo(b.x, canvas.height); ctx.stroke();

                // Wide glow
                const glow = ctx.createLinearGradient(b.x, 0, b.x, canvas.height);
                glow.addColorStop(0, `rgba(${r},${g},${bl},0)`);
                glow.addColorStop(0.5, `rgba(${r},${g},${bl},${alpha * 0.18})`);
                glow.addColorStop(1, `rgba(${r},${g},${bl},0)`);
                ctx.beginPath();
                ctx.strokeStyle = glow;
                ctx.lineWidth = b.width * 22;
                ctx.moveTo(b.x, 0); ctx.lineTo(b.x, canvas.height); ctx.stroke();
            });

            // Center bloom
            const bloom = ctx.createRadialGradient(
                canvas.width * 0.5, canvas.height * 0.45, 0,
                canvas.width * 0.5, canvas.height * 0.45, canvas.width * 0.55
            );
            bloom.addColorStop(0, "rgba(0,80,200,0.08)");
            bloom.addColorStop(1, "transparent");
            ctx.fillStyle = bloom;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            frame++;
            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export default function LandingPage() {
    return (
        <div className="bg-[#04060d] text-white overflow-x-hidden min-h-screen" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=Barlow:wght@300;400&display=swap" rel="stylesheet" />

            <style>{`
                @keyframes fadeUp {
                    from { opacity:0; transform:translateY(2rem); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes glowDot {
                    0%,100% { box-shadow:0 0 0.25rem #00A3FF; opacity:.4; }
                    50%     { box-shadow:0 0 0.8rem #00A3FF, 0 0 1.8rem rgba(0,163,255,.2); opacity:1; }
                }

                .a1 { animation: fadeUp .8s ease .1s both; }
                .a2 { animation: fadeUp .8s ease .3s both; }
                .a3 { animation: fadeUp .8s ease .55s both; }
                .a4 { animation: fadeUp .8s ease .8s both; }
                .dot-glow { animation: glowDot 2.5s ease infinite; }
            `}</style>

            <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-[7%]">
                <BeamBackground />

                <div className="relative z-10 flex flex-col items-center">

                    {/* Badge */}
                    <div className="a1 flex items-center gap-3 mb-10"
                        style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "0.3rem", color: "#00A3FF", textTransform: "uppercase" }}
                    >
                        <span className="dot-glow w-2 h-2 rounded-full bg-[#00A3FF] inline-block" />
                        Soluții Tehnice Integrate
                        <span className="dot-glow w-2 h-2 rounded-full bg-[#00A3FF] inline-block" />
                    </div>


                    {/* Main title */}
                    <h1 className="a2 uppercase leading-none mb-8"
                        style={{ fontWeight: 900, fontSize: "clamp(4rem, 10vw, 8rem)", letterSpacing: "-0.1rem" }}
                    >
                        <span className="block text-white/95">Energie.</span>
                        <span className="block" style={{ WebkitTextStroke: "0.1rem rgba(0,163,255,0.6)", color: "transparent" }}>Precizie.</span>
                        <span className="block text-[#E8192C]">Excelență.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="a3 text-white/50 max-w-xl leading-relaxed mb-14"
                        style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 300, fontSize: "1.2rem" }}
                    >
                        Instalații electrice, sanitare și climatizare —
                        execuție impecabilă pentru proiecte rezidențiale și industriale.
                    </p>

                    {/* Tags */}
                    <div className="a4 flex flex-wrap justify-center gap-3">
                        {["Electricitate", "Instalații Sanitare", "CVC", "Industrial", "Rezidențial"].map(t => (
                            <span key={t}
                                className="border border-white/15 text-white/50 px-4 py-2"
                                style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.18rem", textTransform: "uppercase" }}
                            >{t}</span>
                        ))}
                    </div>

                </div>
            </section>
        </div>
    );
}