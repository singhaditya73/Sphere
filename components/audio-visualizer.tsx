"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string; // Hex color
  className?: string; // Allow custom positioning
}

export function AudioVisualizer({ isPlaying, color = "#a3e635", className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    
    // Wave parameters
    const lines = 8;
    const speed = 0.02; 
    const baseAmplitude = 50;

    const resize = () => {
      // Use offsetWidth/Height of the canvas itself (or parent) to match container
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    // Initial resize
    resize();
    
    // Watch for resize events
    window.addEventListener("resize", resize);

    const draw = () => {
      // Clear with trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // Dark trail for better contrast in small window
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Time step
      time += isPlaying ? speed : speed * 0.1;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const yBase = canvas.height / 2 + (i - lines / 2) * 20; // Tighter spacing for smaller view
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        
        const opacity = Math.max(0.1, 1 - Math.abs(i - lines / 2) / (lines / 2));
        ctx.globalAlpha = opacity;

        for (let x = 0; x < canvas.width; x += 5) {
          const noise = 
            Math.sin(x * 0.01 + time * (i + 1)) * baseAmplitude * (isPlaying ? 0.8 : 0.2) +
            Math.sin(x * 0.02 - time * 2) * (baseAmplitude / 2) * (isPlaying ? 0.8 : 0.1);
          
          const y = yBase + noise;
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full pointer-events-none mix-blend-screen ${className || ''}`}
    />
  );
}
