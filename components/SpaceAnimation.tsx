"use client";

import React, { useEffect, useRef } from 'react';

interface Star {
    x: number;
    y: number;
    z: number;
    size: number;
    color: string;
    opacity: number;
    twinkleSpeed: number;
    twinkleTime: number;
    isSatellite?: boolean;
    speed?: number;
}

const SpaceAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];
        const starColors = ['#ffffff', '#fff4e6', '#e6f2ff', '#f0faff', '#2dd4bf'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const init = () => {
            stars = [];
            // More stars to fill space
            const numStars = 600;
            for (let i = 0; i < numStars; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: Math.random() * canvas.width,
                    size: Math.random() * 2 + 0.5,
                    color: starColors[Math.floor(Math.random() * starColors.length)],
                    opacity: Math.random() * 0.8 + 0.2,
                    twinkleSpeed: Math.random() * 0.08 + 0.02,
                    twinkleTime: Math.random() * Math.PI * 2
                });
            }

            // Add Satellites
            for (let i = 0; i < 15; i++) {
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: Math.random() * 500,
                    size: 1.5,
                    color: '#ffffff',
                    opacity: 0.8,
                    twinkleSpeed: 0,
                    twinkleTime: 0,
                    isSatellite: true,
                    speed: Math.random() * 1.5 + 0.5
                });
            }
        };

        const drawNebula = () => {
            if (!ctx) return;
            const time = Date.now() * 0.0001;
            
            // Draw larger, more vivid nebula gradients
            const gradients = [
                { x: 0.2, y: 0.3, color: 'rgba(45, 212, 191, 0.12)', r: 0.6 },
                { x: 0.8, y: 0.7, color: 'rgba(59, 130, 246, 0.1)', r: 0.7 },
                { x: 0.5, y: 0.5, color: 'rgba(168, 85, 247, 0.08)', r: 0.8 },
                { x: 0.1, y: 0.8, color: 'rgba(16, 185, 129, 0.08)', r: 0.5 }
            ];

            ctx.globalCompositeOperation = 'screen';
            gradients.forEach(g => {
                const x = (g.x + Math.sin(time + g.x * 10) * 0.15) * canvas.width;
                const y = (g.y + Math.cos(time + g.y * 10) * 0.15) * canvas.height;
                const r = g.r * canvas.width;
                
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, g.color);
                grad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            });
            ctx.globalCompositeOperation = 'source-over';
        };

        const animate = () => {
            if (!ctx) return;
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drawNebula();

            stars.forEach(s => {
                if (s.isSatellite) {
                    s.x += s.speed || 1;
                    if (s.x > canvas.width + 100) s.x = -100;
                    
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#ffffff';
                    ctx.fill();
                    
                    // Streak
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(s.x - 40, s.y);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                } else {
                    s.twinkleTime += s.twinkleSpeed;
                    const opacity = s.opacity * (0.4 + Math.sin(s.twinkleTime) * 0.6);
                    
                    s.z -= 0.3;
                    if (s.z <= 0) s.z = canvas.width;
                    
                    const k = 120 / s.z;
                    const px = (s.x - canvas.width / 2) * k + canvas.width / 2;
                    const py = (s.y - canvas.height / 2) * k + canvas.height / 2;

                    if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
                        ctx.beginPath();
                        ctx.arc(px, py, s.size * (1.2 - s.z / canvas.width) * 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = s.color;
                        ctx.globalAlpha = opacity;
                        ctx.fill();
                        ctx.globalAlpha = 1;

                        if (opacity > 0.8 && s.size > 1.2) {
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = s.color;
                            ctx.fill();
                            ctx.shadowBlur = 0;
                        }
                    }
                }
            });

            // Random shooting stars
            if (Math.random() > 0.99) {
                const sx = Math.random() * canvas.width;
                const sy = Math.random() * canvas.height;
                const len = Math.random() * 200 + 100;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + len, sy + len / 3);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // High-tech Scanning Line
            const scanY = (Date.now() * 0.1) % (canvas.height + 400) - 200;
            const scanGrad = ctx.createLinearGradient(0, scanY, 0, scanY + 4);
            scanGrad.addColorStop(0, 'transparent');
            scanGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.15)');
            scanGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = scanGrad;
            ctx.fillRect(0, scanY, canvas.width, 4);

            // Center Atmosphere Pulse (where the globe is)
            const pulseTime = Date.now() * 0.001;
            const pulseSize = 350 + Math.sin(pulseTime) * 20;
            const pulseGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, pulseSize);
            pulseGrad.addColorStop(0, 'rgba(45, 212, 191, 0.03)');
            pulseGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pulseGrad;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, pulseSize, 0, Math.PI * 2);
            ctx.fill();

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', resize);
        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none'
            }}
        />
    );
};

export default SpaceAnimation;
