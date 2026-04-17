"use client";

import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    opacity: number;
}

interface Leaf {
    x: number;
    y: number;
    rotation: number;
    rotationSpeed: number;
    speed: number;
    size: number;
    swing: number;
    swingSpeed: number;
    time: number;
}

const AtmosphericAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let leaves: Leaf[] = [];
        const colors = ['#2dd4bf', '#10b981', '#3b82f6', '#06b6d4'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        const init = () => {
            particles = [];
            leaves = [];
            
            // Increase particle count and size
            for (let i = 0; i < 60; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: (Math.random() - 0.5) * 0.8,
                    size: Math.random() * 4 + 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    opacity: Math.random() * 0.7 + 0.3
                });
            }

            // Increase leaf count and size
            for (let i = 0; i < 25; i++) {
                leaves.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.03,
                    speed: Math.random() * 0.8 + 0.4,
                    size: Math.random() * 30 + 20, // Much bigger leaves
                    swing: Math.random() * 3,
                    swingSpeed: Math.random() * 0.015 + 0.005,
                    time: Math.random() * 100
                });
            }
        };

        const drawLeaf = (leaf: Leaf) => {
            if (!ctx) return;
            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(leaf.rotation + Math.sin(leaf.time * leaf.swingSpeed) * leaf.swing);
            
            // Draw a bolder leaf shape
            ctx.beginPath();
            ctx.moveTo(0, -leaf.size / 2);
            ctx.quadraticCurveTo(leaf.size / 2, 0, 0, leaf.size / 2);
            ctx.quadraticCurveTo(-leaf.size / 2, 0, 0, -leaf.size / 2);
            
            const gradient = ctx.createLinearGradient(0, -leaf.size / 2, 0, leaf.size / 2);
            gradient.addColorStop(0, 'rgba(45, 212, 191, 0.5)'); // Increased opacity
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)'); // Increased opacity
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(45, 212, 191, 0.3)';
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Bolder central vein
            ctx.beginPath();
            ctx.moveTo(0, -leaf.size / 2);
            ctx.lineTo(0, leaf.size / 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Bolder atmospheric waves
            const time = Date.now() * 0.0005;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(0, canvas.height);
                for (let x = 0; x < canvas.width; x += 30) {
                    const y = canvas.height * 0.75 + 
                              Math.sin(x * 0.0015 + time + i) * 150 * (i + 1) * 0.5 +
                              Math.cos(x * 0.0008 - time * 0.8) * 80;
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(canvas.width, canvas.height);
                ctx.fillStyle = i === 0 
                    ? 'rgba(45, 212, 191, 0.08)' 
                    : i === 1 
                        ? 'rgba(59, 130, 246, 0.06)' 
                        : 'rgba(16, 185, 129, 0.06)';
                ctx.fill();
            }

            // Update and draw particles
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fill();
                ctx.globalAlpha = 1;
            });

            // Update and draw leaves
            leaves.forEach(l => {
                l.time++;
                l.y += l.speed;
                l.x += Math.sin(l.time * 0.01) * 0.5;
                l.rotation += l.rotationSpeed;

                if (l.y > canvas.height + l.size) {
                    l.y = -l.size;
                    l.x = Math.random() * canvas.width;
                }

                drawLeaf(l);
            });

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
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 1.0
            }}
        />
    );
};

export default AtmosphericAnimation;
