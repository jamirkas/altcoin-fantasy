'use client';
import { useEffect, useRef } from 'react';

export default function CodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789$€¥₿<>{}[]|/\\#@&';
    const fontSize = 11;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);
    const speeds: number[] = Array(columns).fill(0).map(() => 0.6 + Math.random() * 1.2);
    const lengths: number[] = Array(columns).fill(0).map(() => 5 + Math.floor(Math.random() * 20));

    const colors = [
      '#003300', '#004400', '#005500', '#006600',
      '#00AA00', '#00CC00', '#00FF41', '#33FF66',
      '#00E5FF',
    ];

    let frame = 0;
    const draw = () => {
      frame++;
      // Trail effect
      ctx.fillStyle = 'rgba(5, 5, 8, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random char
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head of the stream (bright)
        ctx.fillStyle = colors[6 + Math.floor(Math.random() * 2)];
        ctx.fillText(char, x, y);

        // Trail (fading)
        for (let j = 1; j <= lengths[i]; j++) {
          const trailY = y - j * fontSize;
          if (trailY < 0) continue;
          const alpha = 1 - j / lengths[i];
          const colorIdx = Math.floor(alpha * 5);
          ctx.fillStyle = colors[colorIdx];
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillText(
            chars[Math.floor(Math.random() * chars.length)],
            x, trailY
          );
        }
        ctx.globalAlpha = 1;

        // Move down
        drops[i] += speeds[i];

        // Reset
        if (y - lengths[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = -Math.floor(Math.random() * 30);
          speeds[i] = 0.5 + Math.random() * 1.5;
          lengths[i] = 5 + Math.floor(Math.random() * 25);
        }
      }
    };

    const interval = setInterval(draw, 35);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ opacity: 0.25 }}
    />
  );
}
