"use client";

import React, { useEffect, useRef } from 'react';

const TrafficAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let roads: Road[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        };

        class Road {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            angle: number;
            length: number;

            constructor(x1: number, y1: number, x2: number, y2: number) {
                this.x1 = x1;
                this.y1 = y1;
                this.x2 = x2;
                this.y2 = y2;
                this.angle = Math.atan2(y2 - y1, x2 - x1);
                this.length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);
                ctx.lineTo(this.x2, this.y2);
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        class Particle {
            road: Road;
            progress: number;
            speed: number;
            color: string;
            size: number;
            glow: string;

            constructor(road: Road) {
                this.road = road;
                this.progress = Math.random();
                this.speed = (0.0005 + Math.random() * 0.0015);
                
                const type = Math.random();
                if (type > 0.6) {
                    this.color = '#ef4444'; // Red
                    this.glow = 'rgba(239, 68, 68, 0.5)';
                } else if (type > 0.3) {
                    this.color = '#ffffff'; // White
                    this.glow = 'rgba(255, 255, 255, 0.5)';
                } else {
                    this.color = '#fbbf24'; // Yellow
                    this.glow = 'rgba(251, 191, 36, 0.5)';
                }
                
                this.size = 1 + Math.random() * 2;
            }

            update() {
                this.progress += this.speed;
                if (this.progress > 1) {
                    this.progress = 0;
                }
            }

            draw() {
                if (!ctx) return;
                const x = this.road.x1 + (this.road.x2 - this.road.x1) * this.progress;
                const y = this.road.y1 + (this.road.y2 - this.road.y1) * this.progress;

                ctx.beginPath();
                ctx.arc(x, y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.glow;
                ctx.fill();
                
                ctx.beginPath();
                const streakLen = 40 * this.speed * 1000;
                const sx = x - Math.cos(this.road.angle) * streakLen;
                const sy = y - Math.sin(this.road.angle) * streakLen;
                ctx.moveTo(x, y);
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = this.glow;
                ctx.lineWidth = this.size;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                ctx.shadowBlur = 0;
            }
        }

        const init = () => {
            roads = [];
            particles = [];
            
            const numRoads = 15;
            for (let i = 0; i < numRoads; i++) {
                const y = Math.random() * canvas.height;
                const road = new Road(-100, y + (Math.random() - 0.5) * 200, canvas.width + 100, y + (Math.random() - 0.5) * 200);
                roads.push(road);
                
                const numParticles = 3 + Math.floor(Math.random() * 5);
                for (let j = 0; j < numParticles; j++) {
                    particles.push(new Particle(road));
                }
            }

            for (let i = 0; i < 8; i++) {
                const x = Math.random() * canvas.width;
                const road = new Road(x + (Math.random() - 0.5) * 200, -100, x + (Math.random() - 0.5) * 200, canvas.height + 100);
                roads.push(road);
                
                const numParticles = 2 + Math.floor(Math.random() * 4);
                for (let j = 0; j < numParticles; j++) {
                    particles.push(new Particle(road));
                }
            }
        };

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            roads.forEach(road => road.draw());
            particles.forEach(p => {
                p.update();
                p.draw();
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
                zIndex: -1,
                opacity: 0.6,
                background: 'linear-gradient(to bottom, #050a08, #0a160f)',
                pointerEvents: 'none'
            }}
        />
    );
};

export default TrafficAnimation;
