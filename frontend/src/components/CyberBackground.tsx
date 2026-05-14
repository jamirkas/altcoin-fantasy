'use client';
import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number; maxLife: number;
  hue: number;
}

export default function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ─── Perspective Grid ───
    const drawGrid = () => {
      const cx = w / 2, cy = h * 0.55;
      const gridSize = 40;
      const horizon = 120;
      const maxDepth = 30;

      ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
      ctx.lineWidth = 0.5;

      for (let z = 1; z < maxDepth; z++) {
        const scale = horizon / (horizon + z * gridSize);
        const y = cy + z * gridSize * scale * 0.8;
        const xSpan = w * scale * 1.5;
        const x1 = cx - xSpan / 2;
        const x2 = cx + xSpan / 2;

        if (y < h) {
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        }
      }

      // Vertical lines (perspective)
      for (let i = -20; i <= 20; i++) {
        const xGround = cx + i * gridSize;
        ctx.beginPath();
        ctx.moveTo(cx + i * 2, cy);
        ctx.lineTo(xGround, h);
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.02)';
        ctx.stroke();
      }
    };

    // ─── Floating Particles ───
    let particles: Particle[] = [];
    const maxParticles = 60;

    const spawnParticle = () => {
      if (particles.length >= maxParticles) return;
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.2,
        size: Math.random() * 2 + 1,
        life: 0,
        maxLife: 200 + Math.random() * 300,
        hue: Math.random() > 0.7 ? 190 : 120, // cyan or green
      });
    };

    // ─── Render Loop ───
    let frame = 0;
    const render = () => {
      frame++;
      ctx.fillStyle = 'rgba(5, 5, 8, 0.15)';
      ctx.fillRect(0, 0, w, h);

      drawGrid();

      // Spawn particles
      if (frame % 8 === 0) spawnParticle();

      // Draw and update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.x < -50 || p.x > w + 50 || p.y < -50 || p.y > h + 50) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = p.life < 30 ? p.life / 30 : 1 - p.life / p.maxLife;
        const hue = p.hue === 190 ? `0, 229, 255` : `0, 255, 65`;

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hue}, ${alpha * 0.1})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hue}, ${alpha * 0.6})`;
        ctx.fill();
      }

      // Connection lines between nearby particles
      ctx.lineWidth = 0.3;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15;
            ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    };

    render();
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
