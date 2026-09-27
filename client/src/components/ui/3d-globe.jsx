import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';
import { cn } from '../../lib/utils';

export const Globe = ({ className, config = {} }) => {
  const canvasRef = useRef(null);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const [r, setR] = useState(0);

  useEffect(() => {
    let phi = 0;
    let width = 0;
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;

    const onResize = () => {
      if (currentCanvas) {
        width = currentCanvas.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(currentCanvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.04, 0.06, 0.09], // Deep dark space background matching #0A0D12
      markerColor: [0, 0.898, 1], // Neon Cyan #00E5FF
      glowColor: [0, 0.5, 0.85], // Vibrant Cyan / Blue glow
      opacity: 0.88,
      markers: [
        // Global Crypto Liquidity Nodes
        { location: [40.7128, -74.006], size: 0.08 }, // New York
        { location: [51.5074, -0.1278], size: 0.07 }, // London
        { location: [50.1109, 8.6821], size: 0.06 },  // Frankfurt
        { location: [25.2048, 55.2708], size: 0.08 }, // Dubai
        { location: [1.3521, 103.8198], size: 0.09 }, // Singapore
        { location: [35.6762, 139.6503], size: 0.07 }, // Tokyo
        { location: [37.5665, 126.978], size: 0.06 },  // Seoul
        { location: [22.3193, 114.1694], size: 0.08 }, // Hong Kong
      ],
      onRender: (state) => {
        // Auto-rotation when not interacting
        if (!pointerInteracting.current) {
          phi += 0.0035;
        }
        state.phi = phi + r;
        state.width = width * 2;
        state.height = width * 2;
      },
      ...config,
    });

    setTimeout(() => {
      if (currentCanvas) currentCanvas.style.opacity = '1';
    }, 100);

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [r, config]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center w-full max-w-[650px] aspect-square mx-auto cursor-grab active:cursor-grabbing select-none',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setR(delta / 180);
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            setR(delta / 180);
          }
        }}
        className="w-full h-full opacity-0 transition-opacity duration-1000 ease-in-out"
        style={{ width: '100%', height: '100%', contain: 'layout paint size' }}
      />
      {/* Surrounding Ambient Radial Glows */}
      <div className="absolute inset-0 pointer-events-none bg-radial from-accent-cyan/15 via-transparent to-transparent blur-3xl opacity-60" />
      <div className="absolute -bottom-10 inset-x-10 h-32 pointer-events-none bg-gradient-to-t from-[#0A0D12] via-[#0A0D12]/70 to-transparent" />
    </div>
  );
};
