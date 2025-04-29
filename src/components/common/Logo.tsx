'use client';

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <svg 
      viewBox="0 0 120 120" 
      xmlns="http://www.w3.org/2000/svg"
      className={className} 
      fill="none"
    >
      <path 
        d="M60 10L100 30V70L60 90L20 70V30L60 10Z" 
        fill="#1a2228" 
        stroke="#5acce5" 
        strokeWidth="4"
      />
      <path 
        d="M60 20L85 32.5V57.5L60 70L35 57.5V32.5L60 20Z" 
        fill="none" 
        stroke="#5acce5" 
        strokeWidth="2"
      />
      <text 
        x="60" 
        y="60" 
        textAnchor="middle" 
        dominantBaseline="middle" 
        fill="#5acce5" 
        fontSize="16"
        fontWeight="bold"
      >
        VISTA
      </text>
    </svg>
  );
}; 