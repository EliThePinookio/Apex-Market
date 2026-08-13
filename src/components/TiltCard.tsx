import React, { useState, useRef } from 'react';

export type ElevationLevel = 'normal' | 'elevated' | 'floating' | 'hero';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
  elevation?: ElevationLevel;
  glowColor?: 'emerald' | 'amber' | 'teal' | 'rose' | 'none';
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  onClick,
  maxTilt = 6,
  elevation = 'normal',
  glowColor = 'none',
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -maxTilt;
    const rotY = ((x - centerX) / centerX) * maxTilt;

    setRotateX(rotX);
    setRotateY(rotY);
    setIsHovered(true);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.12,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  // Soft diffused multi-layered ambient shadows based on elevation
  const shadowClasses = {
    normal: 'shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_10px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_18px_35px_-8px_rgba(15,23,42,0.09)]',
    elevated: 'shadow-[0_16px_35px_-8px_rgba(15,23,42,0.08),0_6px_14px_-3px_rgba(15,23,42,0.04)] hover:shadow-[0_24px_45px_-10px_rgba(15,23,42,0.12)]',
    floating: 'shadow-[0_22px_45px_-10px_rgba(15,23,42,0.12),0_8px_20px_-4px_rgba(16,185,129,0.08)] hover:shadow-[0_30px_60px_-12px_rgba(16,185,129,0.15)]',
    hero: 'shadow-[0_30px_60px_-12px_rgba(6,78,59,0.22),0_12px_24px_-6px_rgba(15,23,42,0.12)]',
  }[elevation];

  const glowClasses = {
    emerald: 'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-emerald-500/10 before:blur-xl',
    amber: 'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-amber-500/10 before:blur-xl',
    teal: 'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-teal-500/10 before:blur-xl',
    rose: 'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-rose-500/10 before:blur-xl',
    none: '',
  }[glowColor];

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${isHovered ? '6px' : '0px'})`,
        transition: rotateX === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease' : 'transform 0.08s ease-out',
      }}
      className={`relative overflow-hidden cursor-pointer select-none transition-all duration-300 active:scale-[0.98] ${shadowClasses} ${glowClasses} ${className}`}
    >
      {/* Specular Glare Overlay */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 rounded-[inherit] z-10"
        style={{
          background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 65%)`,
          opacity: glarePos.opacity,
        }}
      />
      {children}
    </div>
  );
};
