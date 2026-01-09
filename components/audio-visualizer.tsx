"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  color?: string; // Hex color
}

export function AudioVisualizer({ isPlaying, color = "#a3e635" }: AudioVisualizerProps) {
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
    const speed = 0.02; // Global speed factor
    const baseAmplitude = 50;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.2)"; // Fade out trail
      ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear with trail

      // If playing, advance time fast. If paused, crawl slowly.
      time += isPlaying ? speed : speed * 0.1;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const yBase = canvas.height / 2 + (i - lines / 2) * 40;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = color; // Use prop color
        
        // Vary opacity based on index
        const opacity = Math.max(0.1, 1 - Math.abs(i - lines / 2) / (lines / 2));
        ctx.globalAlpha = opacity;

        for (let x = 0; x < canvas.width; x += 5) {
          // Complex wave function
          // Mix multiple sine waves with time and index offsets
          const noise = 
            Math.sin(x * 0.003 + time * (i + 1)) * baseAmplitude * (isPlaying ? 1 : 0.2) +
            Math.sin(x * 0.01 - time * 2) * (baseAmplitude / 2) * (isPlaying ? 1 : 0.1);
          
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
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen"
    />
  );
}
