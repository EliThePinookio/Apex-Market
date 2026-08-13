import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';

export interface BackgroundCanvasProps {
  activeTab?: string;
}

interface SectionTheme {
  baseBg: string;
  orb1: string;
  orb2: string;
  orb3: string;
  orb4: string;
  cursorGlow: string;
}

const LIGHT_SECTION_THEMES: Record<string, SectionTheme> = {
  dashboard: {
    baseBg: '#f7f9f5',
    orb1: 'rgba(16, 185, 129, 0.15)', // Emerald
    orb2: 'rgba(52, 211, 153, 0.18)', // Mint
    orb3: 'rgba(163, 230, 53, 0.12)', // Warm Olive/Lime
    orb4: 'rgba(254, 243, 199, 0.38)', // Warm Cream Glow
    cursorGlow: 'rgba(16, 185, 129, 0.14)',
  },
  pos: {
    baseBg: '#f6faf6',
    orb1: 'rgba(5, 150, 105, 0.18)', // Vibrant Emerald
    orb2: 'rgba(110, 231, 183, 0.20)', // Bright Mint
    orb3: 'rgba(253, 230, 138, 0.30)', // Warm Golden Amber
    orb4: 'rgba(16, 185, 129, 0.15)',
    cursorGlow: 'rgba(5, 150, 105, 0.15)',
  },
  inventory: {
    baseBg: '#f8fbf5',
    orb1: 'rgba(101, 163, 13, 0.15)', // Olive Sage
    orb2: 'rgba(163, 230, 53, 0.16)', // Lime
    orb3: 'rgba(254, 240, 138, 0.32)', // Warm Cream
    orb4: 'rgba(16, 185, 129, 0.12)',
    cursorGlow: 'rgba(101, 163, 13, 0.13)',
  },
  transactions: {
    baseBg: '#f5f9f6',
    orb1: 'rgba(4, 120, 87, 0.16)', // Deep Emerald
    orb2: 'rgba(52, 211, 153, 0.18)', // Mint
    orb3: 'rgba(245, 158, 11, 0.16)', // Amber Gold
    orb4: 'rgba(16, 185, 129, 0.14)',
    cursorGlow: 'rgba(4, 120, 87, 0.14)',
  },
  analytics: {
    baseBg: '#f4f8f7',
    orb1: 'rgba(13, 148, 136, 0.16)', // Deep Teal
    orb2: 'rgba(45, 212, 191, 0.18)', // Mint Teal
    orb3: 'rgba(129, 140, 248, 0.13)', // Analytical Indigo
    orb4: 'rgba(16, 185, 129, 0.14)',
    cursorGlow: 'rgba(13, 148, 136, 0.13)',
  },
  customers: {
    baseBg: '#f5faf9',
    orb1: 'rgba(45, 212, 191, 0.16)', // Soft Teal
    orb2: 'rgba(167, 243, 208, 0.24)', // Pale Emerald
    orb3: 'rgba(56, 189, 248, 0.13)', // Soft Sky
    orb4: 'rgba(254, 243, 199, 0.30)', // Warm Cream
    cursorGlow: 'rgba(45, 212, 191, 0.13)',
  },
  settings: {
    baseBg: '#f9faf6',
    orb1: 'rgba(220, 252, 231, 0.38)', // Pale Mint
    orb2: 'rgba(254, 243, 199, 0.40)', // Warm Cream
    orb3: 'rgba(134, 239, 172, 0.16)', // Calm Green
    orb4: 'rgba(226, 232, 240, 0.32)', // Soft Neutral
    cursorGlow: 'rgba(16, 185, 129, 0.11)',
  },
};

const DARK_SECTION_THEMES: Record<string, SectionTheme> = {
  dashboard: {
    baseBg: '#090d16',
    orb1: 'rgba(5, 150, 105, 0.25)', // Emerald Neon Glow
    orb2: 'rgba(16, 185, 129, 0.18)', // Mint
    orb3: 'rgba(14, 116, 144, 0.18)', // Dark Cyan
    orb4: 'rgba(30, 41, 59, 0.5)', // Slate Deep
    cursorGlow: 'rgba(16, 185, 129, 0.2)',
  },
  pos: {
    baseBg: '#071018',
    orb1: 'rgba(16, 185, 129, 0.28)',
    orb2: 'rgba(5, 150, 105, 0.22)',
    orb3: 'rgba(217, 119, 6, 0.16)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(16, 185, 129, 0.22)',
  },
  inventory: {
    baseBg: '#091114',
    orb1: 'rgba(101, 163, 13, 0.22)',
    orb2: 'rgba(16, 185, 129, 0.2)',
    orb3: 'rgba(202, 138, 4, 0.15)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(101, 163, 13, 0.18)',
  },
  transactions: {
    baseBg: '#090f1a',
    orb1: 'rgba(4, 120, 87, 0.25)',
    orb2: 'rgba(16, 185, 129, 0.2)',
    orb3: 'rgba(217, 119, 6, 0.18)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(4, 120, 87, 0.2)',
  },
  analytics: {
    baseBg: '#0a0e1c',
    orb1: 'rgba(13, 148, 136, 0.25)',
    orb2: 'rgba(99, 102, 241, 0.2)',
    orb3: 'rgba(16, 185, 129, 0.18)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(13, 148, 136, 0.2)',
  },
  customers: {
    baseBg: '#091118',
    orb1: 'rgba(45, 212, 191, 0.22)',
    orb2: 'rgba(16, 185, 129, 0.2)',
    orb3: 'rgba(14, 165, 233, 0.16)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(45, 212, 191, 0.18)',
  },
  settings: {
    baseBg: '#080d16',
    orb1: 'rgba(16, 185, 129, 0.2)',
    orb2: 'rgba(51, 65, 85, 0.35)',
    orb3: 'rgba(30, 41, 59, 0.5)',
    orb4: 'rgba(15, 23, 42, 0.6)',
    cursorGlow: 'rgba(16, 185, 129, 0.15)',
  },
};

interface ParticleSparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  speed: number;
}

export const triggerCelebration = (x?: number, y?: number) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app-celebration', {
      detail: {
        x: x ?? window.innerWidth / 2,
        y: y ?? window.innerHeight / 2,
      },
    });
    window.dispatchEvent(event);
  }
};

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ activeTab = 'dashboard' }) => {
  const { isDark } = useTheme();
  const themes = isDark ? DARK_SECTION_THEMES : LIGHT_SECTION_THEMES;
  const theme = themes[activeTab] || themes.dashboard;

  // Desktop Mouse tracking
  const [cursorPos, setCursorPos] = useState({ x: -500, y: -500 });
  const [isCursorActive, setIsCursorActive] = useState(false);
  const targetPos = useRef({ x: -500, y: -500 });
  const rafRef = useRef<number | null>(null);

  // Sparkles state
  const [sparkles, setSparkles] = useState<ParticleSparkle[]>([]);

  // Update body background color dynamically for smooth transition
  useEffect(() => {
    document.body.style.backgroundColor = theme.baseBg;
  }, [theme.baseBg]);

  // Smooth mouse move damping loop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isCursorActive) setIsCursorActive(true);
    };

    const handleMouseLeave = () => {
      setIsCursorActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    const updateLoop = () => {
      setCursorPos((prev) => {
        const dx = targetPos.current.x - prev.x;
        const dy = targetPos.current.y - prev.y;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return prev;
        return {
          x: prev.x + dx * 0.1,
          y: prev.y + dy * 0.1,
        };
      });
      rafRef.current = requestAnimationFrame(updateLoop);
    };

    rafRef.current = requestAnimationFrame(updateLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCursorActive]);

  // Listen for celebratory events (e.g. sale completed, stock updated, customer added)
  useEffect(() => {
    const handleCelebration = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number }>;
      const { x, y } = customEvent.detail || {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };

      const colors = ['#10b981', '#34d399', '#f59e0b', '#059669', '#38bdf8', '#fbbf24'];
      const newSparkles: ParticleSparkle[] = Array.from({ length: 16 }).map((_, i) => ({
        id: Date.now() + i,
        x,
        y,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
        speed: Math.random() * 80 + 50,
      }));

      setSparkles(newSparkles);

      setTimeout(() => {
        setSparkles([]);
      }, 1200);
    };

    window.addEventListener('app-celebration', handleCelebration);
    return () => {
      window.removeEventListener('app-celebration', handleCelebration);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Layer 1: Base Atmospheric Fill & Top Ambient Gradient Light */}
      <div
        className="absolute inset-0 transition-colors duration-300 ease-out"
        style={{ backgroundColor: theme.baseBg }}
      >
        {/* Studio Directional Top Ambient Light Gradient */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(120% 80% at 20% 0%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 100%)',
          }}
        />
      </div>

      {/* Layer 2: Seamless Fine Micro Noise / Grain Texture Surface */}
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Layer 3: Subconscious Drifting Atmospheric Color Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Orb 1: Top-Left Primary Accent Glow */}
        <div
          className="absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full blur-[100px] animate-float-orb-1 transition-colors duration-300"
          style={{ backgroundColor: theme.orb1 }}
        />

        {/* Orb 2: Top-Right Secondary Mint Glow */}
        <div
          className="absolute -top-16 -right-24 w-[42rem] h-[42rem] rounded-full blur-[110px] animate-float-orb-2 transition-colors duration-300"
          style={{ backgroundColor: theme.orb2 }}
        />

        {/* Orb 3: Center-Bottom Olive/Cream Light Surface */}
        <div
          className="absolute top-[40%] left-[25%] w-[48rem] h-[48rem] rounded-full blur-[130px] animate-float-orb-3 transition-colors duration-300"
          style={{ backgroundColor: theme.orb3 }}
        />

        {/* Orb 4: Bottom-Right Warm Ambient Glow */}
        <div
          className="absolute -bottom-32 -right-32 w-[38rem] h-[38rem] rounded-full blur-[110px] animate-float-orb-4 transition-colors duration-300"
          style={{ backgroundColor: theme.orb4 }}
        />
      </div>

      {/* Layer 4: Organic Wave Form Background Art */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60">
        <svg
          className="w-full h-full max-w-7xl animate-subtle-wave opacity-[0.06] text-teal-900"
          viewBox="0 0 1000 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 100 300 Q 300 150 500 300 T 900 300 Q 950 500 800 700 T 200 800 Q 50 600 100 300 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {/* Layer 5: Desktop Cursor Ambient Illumination Glow */}
      <div
        className="absolute rounded-full transition-opacity duration-700 hidden md:block"
        style={{
          left: cursorPos.x - 250,
          top: cursorPos.y - 250,
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${theme.cursorGlow} 0%, rgba(255,255,255,0) 70%)`,
          opacity: isCursorActive ? 1 : 0,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Gamified Celebratory Sparkles Particle Overlay */}
      {sparkles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {sparkles.map((sp) => {
            const dx = Math.cos(sp.angle) * sp.speed;
            const dy = Math.sin(sp.angle) * sp.speed;
            return (
              <div
                key={sp.id}
                className="absolute rounded-full animate-ping"
                style={{
                  left: sp.x,
                  top: sp.y,
                  width: sp.size,
                  height: sp.size,
                  backgroundColor: sp.color,
                  boxShadow: `0 0 12px ${sp.color}`,
                  transform: `translate3d(${dx}px, ${dy}px, 0)`,
                  transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 1s ease-out',
                  opacity: 0,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
