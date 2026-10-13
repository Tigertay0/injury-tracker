// Vapour Text Effect by jatin-yadav05, from 21st.dev:
// https://21st.dev/jatin-yadav05/vapour-text-effect
// Particle logic kept as published. Changes: typed, demo wrapper removed, the hidden
// SEO copy dropped (the page provides its own accessible text), and a plain text
// fallback for reduced motion.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  texts: string[];
  font?: { fontFamily?: string; fontSize?: string; fontWeight?: number };
  /** rgb() or rgba() only; the particle sampler parses it. */
  color?: string;
  spread?: number;
  density?: number;
  animation?: { vaporizeDuration?: number; fadeInDuration?: number; waitDuration?: number };
  direction?: 'left-to-right' | 'right-to-left';
  alignment?: 'left' | 'center' | 'right';
};

type Particle = {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  color: string;
  opacity: number;
  originalAlpha: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  speed: number;
  shouldFadeQuickly?: boolean;
};

type Bounds = { left: number; right: number; width: number };
type State = 'static' | 'vaporizing' | 'fadingIn' | 'waiting';

export function VaporizeTextCycle({
  texts,
  font = { fontFamily: 'sans-serif', fontSize: '50px', fontWeight: 400 },
  color = 'rgb(255, 255, 255)',
  spread = 5,
  density = 5,
  animation = { vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 0.5 },
  direction = 'left-to-right',
  alignment = 'center',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<Bounds | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isInView = useIsInView(wrapperRef);
  const particlesRef = useRef<Particle[]>([]);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>('static');
  const progressRef = useRef(0);
  const fadeRef = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const density01 = transformValue(density, [0, 10], [0.3, 1], true);
  const dpr = useMemo(() => (typeof window !== 'undefined' ? window.devicePixelRatio * 1.5 || 1 : 1), []);

  const durations = useMemo(
    () => ({
      vaporize: (animation.vaporizeDuration ?? 2) * 1000,
      fadeIn: (animation.fadeInDuration ?? 1) * 1000,
      wait: (animation.waitDuration ?? 0.5) * 1000,
    }),
    [animation.vaporizeDuration, animation.fadeInDuration, animation.waitDuration],
  );

  const fontSize = parseInt(font.fontSize?.replace('px', '') || '50', 10);
  const multipliedSpread = calculateVaporizeSpread(fontSize) * spread;

  const update = useCallback(
    (particles: Particle[], vaporizeX: number, dt: number) => updateParticles(particles, vaporizeX, dt, multipliedSpread, durations.vaporize, direction, density01),
    [multipliedSpread, durations.vaporize, direction, density01],
  );

  useEffect(() => {
    if (isInView) {
      const t = setTimeout(() => setState('vaporizing'), 0);
      return () => clearTimeout(t);
    }
    setState('static');
    return undefined;
  }, [isInView]);

  useEffect(() => {
    if (!isInView) return;
    let last = performance.now();
    let frameId = 0;

    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !particlesRef.current.length) {
        frameId = requestAnimationFrame(animate);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state === 'static' || state === 'waiting') {
        renderParticles(ctx, particlesRef.current, dpr);
      } else if (state === 'vaporizing') {
        progressRef.current += (dt * 100) / (durations.vaporize / 1000);
        const b = boundsRef.current;
        if (b) {
          const progress = Math.min(100, progressRef.current);
          const vaporizeX = direction === 'left-to-right' ? b.left + (b.width * progress) / 100 : b.right - (b.width * progress) / 100;
          const done = update(particlesRef.current, vaporizeX, dt);
          renderParticles(ctx, particlesRef.current, dpr);
          if (progressRef.current >= 100 && done) {
            setIndex((i) => (i + 1) % texts.length);
            setState('fadingIn');
            fadeRef.current = 0;
          }
        }
      } else if (state === 'fadingIn') {
        fadeRef.current += (dt * 1000) / durations.fadeIn;
        ctx.save();
        ctx.scale(dpr, dpr);
        for (const p of particlesRef.current) {
          p.x = p.originalX;
          p.y = p.originalY;
          const opacity = Math.min(fadeRef.current, 1) * p.originalAlpha;
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${opacity})`);
          ctx.fillRect(p.x / dpr, p.y / dpr, 1, 1);
        }
        ctx.restore();
        if (fadeRef.current >= 1) setState('waiting');
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state, isInView, texts.length, direction, dpr, update, durations]);

  // Hold the new word, then start the next vaporize pass
  useEffect(() => {
    if (state !== 'waiting') return;
    const t = setTimeout(() => {
      progressRef.current = 0;
      resetParticles(particlesRef.current);
      setState('vaporizing');
    }, durations.wait);
    return () => clearTimeout(t);
  }, [state, durations.wait]);

  // Sample the current word into particles whenever it, the size or the font changes
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const result = renderCanvas(canvas, { text: texts[index] ?? '', font, color, alignment }, size, dpr);
      if (result) {
        particlesRef.current = result.particles;
        boundsRef.current = result.bounds;
      }
    };
    draw();
    // Draw again once the web font has loaded, so particles use the real face
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && draw());
    return () => {
      cancelled = true;
    };
  }, [texts, index, font, color, alignment, size, dpr]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ minWidth: 30, minHeight: 20, pointerEvents: 'none' }} />
    </div>
  );
}

function renderCanvas(
  canvas: HTMLCanvasElement,
  opts: { text: string; font: NonNullable<Props['font']>; color: string; alignment: NonNullable<Props['alignment']> },
  size: { width: number; height: number },
  dpr: number,
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !size.width || !size.height) return null;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
  canvas.width = Math.floor(size.width * dpr);
  canvas.height = Math.floor(size.height * dpr);

  const fontSize = parseInt(opts.font.fontSize?.replace('px', '') || '50', 10);
  const font = `${opts.font.fontWeight ?? 400} ${fontSize * dpr}px ${opts.font.fontFamily ?? 'sans-serif'}`;
  const color = parseColor(opts.color);
  const textX = opts.alignment === 'center' ? canvas.width / 2 : opts.alignment === 'left' ? 0 : canvas.width;
  return createParticles(ctx, canvas, opts.text, textX, canvas.height / 2, font, color, opts.alignment);
}

function createParticles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  textX: number,
  textY: number,
  font: string,
  color: string,
  alignment: 'left' | 'center' | 'right',
) {
  const particles: Particle[] = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = alignment;
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingQuality = 'high';
  ctx.imageSmoothingEnabled = true;

  const width = ctx.measureText(text).width;
  const left = alignment === 'center' ? textX - width / 2 : alignment === 'left' ? textX : textX - width;
  const bounds = { left, right: left + width, width };

  ctx.fillText(text, textX, textY);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const currentDPR = canvas.width / parseInt(canvas.style.width, 10);
  const sampleRate = Math.max(1, Math.round(currentDPR / 3));

  for (let y = 0; y < canvas.height; y += sampleRate) {
    for (let x = 0; x < canvas.width; x += sampleRate) {
      const i = (y * canvas.width + x) * 4;
      const alpha = data[i + 3];
      if (alpha > 0) {
        const originalAlpha = (alpha / 255) * (sampleRate / currentDPR);
        particles.push({
          x,
          y,
          originalX: x,
          originalY: y,
          color: `rgba(${data[i]}, ${data[i + 1]}, ${data[i + 2]}, ${originalAlpha})`,
          opacity: originalAlpha,
          originalAlpha,
          velocityX: 0,
          velocityY: 0,
          angle: 0,
          speed: 0,
        });
      }
    }
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { particles, bounds };
}

function updateParticles(particles: Particle[], vaporizeX: number, dt: number, spread: number, duration: number, direction: string, density: number) {
  let allVaporized = true;
  for (const p of particles) {
    const hit = direction === 'left-to-right' ? p.originalX <= vaporizeX : p.originalX >= vaporizeX;
    if (!hit) {
      allVaporized = false;
      continue;
    }
    if (p.speed === 0) {
      p.angle = Math.random() * Math.PI * 2;
      p.speed = (Math.random() * 1 + 0.5) * spread;
      p.velocityX = Math.cos(p.angle) * p.speed;
      p.velocityY = Math.sin(p.angle) * p.speed;
      p.shouldFadeQuickly = Math.random() > density;
    }
    if (p.shouldFadeQuickly) {
      p.opacity = Math.max(0, p.opacity - dt);
    } else {
      const dx = p.originalX - p.x;
      const dy = p.originalY - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const damping = Math.max(0.95, 1 - distance / (100 * spread));
      const randomSpread = spread * 3;
      p.velocityX = (p.velocityX + (Math.random() - 0.5) * randomSpread + dx * 0.002) * damping;
      p.velocityY = (p.velocityY + (Math.random() - 0.5) * randomSpread + dy * 0.002) * damping;
      const max = spread * 2;
      const v = Math.sqrt(p.velocityX * p.velocityX + p.velocityY * p.velocityY);
      if (v > max) {
        p.velocityX *= max / v;
        p.velocityY *= max / v;
      }
      p.x += p.velocityX * dt * 20;
      p.y += p.velocityY * dt * 10;
      p.opacity = Math.max(0, p.opacity - dt * 0.25 * (2000 / duration));
    }
    if (p.opacity > 0.01) allVaporized = false;
  }
  return allVaporized;
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], dpr: number) {
  ctx.save();
  ctx.scale(dpr, dpr);
  for (const p of particles) {
    if (p.opacity > 0) {
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`);
      ctx.fillRect(p.x / dpr, p.y / dpr, 1, 1);
    }
  }
  ctx.restore();
}

function resetParticles(particles: Particle[]) {
  for (const p of particles) {
    p.x = p.originalX;
    p.y = p.originalY;
    p.opacity = p.originalAlpha;
    p.speed = 0;
    p.velocityX = 0;
    p.velocityY = 0;
  }
}

function calculateVaporizeSpread(fontSize: number) {
  const points = [
    { size: 20, spread: 0.2 },
    { size: 50, spread: 0.5 },
    { size: 100, spread: 1.5 },
  ];
  if (fontSize <= points[0].size) return points[0].spread;
  if (fontSize >= points[points.length - 1].size) return points[points.length - 1].spread;
  let i = 0;
  while (i < points.length - 1 && points[i + 1].size < fontSize) i++;
  const a = points[i];
  const b = points[i + 1];
  return a.spread + ((fontSize - a.size) * (b.spread - a.spread)) / (b.size - a.size);
}

function parseColor(color: string) {
  const rgba = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgba) return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${rgba[4]})`;
  const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, 1)`;
  return 'rgba(0, 0, 0, 1)';
}

function transformValue(input: number, [inMin, inMax]: number[], [outMin, outMax]: number[], clamp = false) {
  const result = outMin + ((input - inMin) / (inMax - inMin)) * (outMax - outMin);
  if (!clamp) return result;
  return outMax > outMin ? Math.min(Math.max(result, outMin), outMax) : Math.min(Math.max(result, outMax), outMin);
}

function useIsInView(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0, rootMargin: '50px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
