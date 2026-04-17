"use client";

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size, width, height, className = "", style = {} }) => {
  // If size is provided, use it for width and calculate height
  // Otherwise use width/height or defaults
  const finalWidth = size || width || 48;
  const finalHeight = height || (finalWidth * 0.618);
  
  return (
    <div 
      className={className} 
      style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative',
        width: finalWidth,
        height: finalHeight
      }}
    >
      <Image 
        src="/images/logo.png" 
        alt="Respira Flare Logo" 
        fill
        style={{ objectFit: 'contain' }}
        priority
      />
    </div>
  );
};

export default Logo;
