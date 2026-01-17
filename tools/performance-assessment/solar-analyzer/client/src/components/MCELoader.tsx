import { useEffect, useState } from "react";

interface MCELoaderProps {
  size?: number;
  className?: string;
}

export default function MCELoader({ size = 80, className = "" }: MCELoaderProps) {
  const [dashOffset, setDashOffset] = useState(0);
  
  // Calculate perimeter for the border animation
  const borderRadius = size / 2 + 8; // 8px padding around the logo
  const perimeter = 2 * Math.PI * borderRadius;
  
  useEffect(() => {
    // Animate the dash offset to create a tracing effect
    let animationFrame: number;
    let startTime: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Complete one full rotation every 2 seconds
      const progress = (elapsed % 2000) / 2000;
      setDashOffset(perimeter * (1 - progress));
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [perimeter]);
  
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {/* MCE Logo */}
      <img
        src="/mce-logo.png"
        alt="MCE Logo"
        className="w-full h-full object-contain"
      />
      
      {/* Animated tracing border */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx="50%"
          cy="50%"
          r={borderRadius}
          fill="none"
          stroke="rgb(59, 130, 246)" // blue-500
          strokeWidth="3"
          strokeDasharray={perimeter}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
          }}
        />
      </svg>
    </div>
  );
}
