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

    // Glowing particle color palette: Electric Cyan, Neon Violet, Vivid Emerald
    const colors = [
      'rgba(6, 182, 212, ',   // Cyan #06B6D4
      'rgba(139, 92, 246, ',  // Violet #8B5CF6
      'rgba(16, 185, 129, ',  // Emerald #10B981
      'rgba(59, 130, 246, ',  // Blue #3B82F6
    ];

    const particleCount = Math.min(35, Math.floor((width * height) / 25000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 60 + 20, // soft orb radius
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.15 + 0.05,
        alphaSpeed: (Math.random() - 0.5) * 0.002,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Deep dark atmosphere fill
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // Draw soft ambient floating orbs
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce gently at screen boundaries
        if (p.x < -p.radius) p.x = width + p.radius;
        if (p.x > width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = height + p.radius;
        if (p.y > height + p.radius) p.y = -p.radius;

        p.alpha += p.alphaSpeed;
        if (p.alpha <= 0.03 || p.alpha >= 0.22) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        const currentRadius = p.radius + Math.sin(time * p.pulseSpeed * 10) * 8;

        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          Math.max(1, currentRadius)
        );
        gradient.addColorStop(0, p.color + p.alpha + ')');
        gradient.addColorStop(0.5, p.color + (p.alpha * 0.4) + ')');
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
      style={{ background: '#0B0F19' }}
    />
  );
};
