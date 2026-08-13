import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
  pulseSpeed: number;
}

export const BackgroundCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Soft white/emerald light palette: Mint, Emerald, Soft Teal, Light Sage
    const colors = [
      'rgba(16, 185, 129, ',  // Emerald #10B981
      'rgba(5, 150, 105, ',   // Dark Emerald #059669
      'rgba(52, 211, 153, ',  // Mint #34D399
      'rgba(20, 184, 166, ',  // Teal #14B8A6
    ];

    const particleCount = Math.min(25, Math.floor((width * height) / 35000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 80 + 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.08 + 0.02,
        alphaSpeed: (Math.random() - 0.5) * 0.001,
        pulseSpeed: Math.random() * 0.015 + 0.005,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Clean off-white canvas fill
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw ultra-subtle micro grid pattern
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw soft ambient floating emerald/mint light orbs
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -p.radius) p.x = width + p.radius;
        if (p.x > width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = height + p.radius;
        if (p.y > height + p.radius) p.y = -p.radius;

        p.alpha += p.alphaSpeed;
        if (p.alpha <= 0.015 || p.alpha >= 0.1) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        const currentRadius = p.radius + Math.sin(time * p.pulseSpeed * 10) * 10;

        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          Math.max(1, currentRadius)
        );
        gradient.addColorStop(0, p.color + p.alpha + ')');
        gradient.addColorStop(0.6, p.color + (p.alpha * 0.3) + ')');
        gradient.addColorStop(1, p.color + '0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, currentRadius), 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#f8fafc' }}
    />
  );
};

