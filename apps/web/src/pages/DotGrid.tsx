import { useEffect, useRef, useCallback } from 'react';

// Pindahkan fungsi utility ke luar komponen agar tidak memicu re-render / warning dependency
const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const interpolateColor = (c1: string, c2: string, factor: number) => {
  const c1Rgb = hexToRgb(c1);
  const c2Rgb = hexToRgb(c2);
  const r = Math.round(c1Rgb.r + factor * (c2Rgb.r - c1Rgb.r));
  const g = Math.round(c1Rgb.g + factor * (c2Rgb.g - c1Rgb.g));
  const b = Math.round(c1Rgb.b + factor * (c2Rgb.b - c1Rgb.b));
  return `rgb(${r}, ${g}, ${b})`;
};

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  shockRadius?: number;
  shockStrength?: number;
  resistance?: number;
  returnDuration?: number;
}

export default function DotGrid({
  dotSize = 5,
  gap = 15,
  baseColor = '#271E37',
  activeColor = '#5227FF',
  proximity = 120,
  shockRadius = 250,
  shockStrength = 5,
  resistance = 750,
  returnDuration = 1.5,
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dots = useRef<{x: number; y: number; baseX: number; baseY: number; color: string; scale: number; vx: number; vy: number}[]>([]);
  const mouse = useRef({ x: -1000, y: -1000, isDown: false, clickX: -1000, clickY: -1000, timeClicked: 0 });

  const initGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    dots.current = [];
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.imageSmoothingEnabled = true;
    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        dots.current.push({
          x: x + gap / 2,
          y: y + gap / 2,
          baseX: x + gap / 2,
          baseY: y + gap / 2,
          color: baseColor,
          scale: 1,
          vx: 0,
          vy: 0,
        });
      }
    }
  }, [baseColor, gap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeObserver = new ResizeObserver((entries) => {
      // Perbaikan: Mengubah 'let' menjadi 'const'
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        initGrid(ctx, width, height);
      }
    });
    resizeObserver.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.current.x = -1000;
      mouse.current.y = -1000;
    };

    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.isDown = true;
      mouse.current.clickX = e.clientX - rect.left;
      mouse.current.clickY = e.clientY - rect.top;
      mouse.current.timeClicked = performance.now();
      
      dots.current.forEach(dot => {
        const dx = dot.x - mouse.current.clickX;
        const dy = dot.y - mouse.current.clickY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < shockRadius) {
          const force = (1 - dist / shockRadius) * shockStrength * 10;
          const angle = Math.atan2(dy, dx);
          dot.vx += Math.cos(angle) * force;
          dot.vy += Math.sin(angle) * force;
        }
      });
    };

    const handleMouseUp = () => {
      mouse.current.isDown = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); 
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mX = mouse.current.x;
      const mY = mouse.current.y;

      const K = 100 / returnDuration; 
      const B = resistance / 100;

      for (let i = 0; i < dots.current.length; i++) {
        const dot = dots.current[i];
        
        const dxRest = dot.baseX - dot.x;
        const dyRest = dot.baseY - dot.y;

        const forceX = dxRest * K;
        const forceY = dyRest * K;

        dot.vx = (dot.vx + forceX * dt) * (1 - B * dt);
        dot.vy = (dot.vy + forceY * dt) * (1 - B * dt);

        dot.x += dot.vx * dt;
        dot.y += dot.vy * dt;

        const dx = dot.x - mX;
        const dy = dot.y - mY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let factor = 0;
        if (dist < proximity) {
          factor = 1 - Math.pow(dist / proximity, 2);
        }

        const size = dotSize + factor * (dotSize * 1.5);
        ctx.fillStyle = interpolateColor(baseColor, activeColor, factor);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [baseColor, activeColor, proximity, dotSize, gap, shockRadius, shockStrength, resistance, returnDuration, initGrid]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}