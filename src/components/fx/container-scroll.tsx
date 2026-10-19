// Container Scroll Animation by Aceternity, from 21st.dev:
// https://21st.dev/aceternity/container-scroll-animation
// Same motion as published (rotateX 20 -> 0, scale, lift). Changes: motion/react
// instead of framer-motion, typed props, the frame colors as props, and a flat
// card when the visitor prefers reduced motion.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export function ContainerScroll({ titleComponent, children, frameClassName }: { titleComponent: ReactNode; children: ReactNode; frameClassName?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const reduce = usePrefersReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -100]);

  return (
    <div ref={containerRef} className="relative flex h-[52rem] items-center justify-center p-2 md:h-[80rem] md:p-20">
      <div className="relative w-full py-10 md:py-40" style={{ perspective: '1000px' }}>
        <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
          {titleComponent}
        </motion.div>
        <ScrollCard rotate={rotate} scale={scale} className={frameClassName}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
}

function ScrollCard({ rotate, scale, children, className }: { rotate: MotionValue<number>; scale: MotionValue<number>; children: ReactNode; className?: string }) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow: '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className={cn('mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[var(--radius-panel)] border-4 border-[#6C6C6C] bg-[#222222] p-2 md:h-[40rem] md:p-6', className)}
    >
      <div className="h-full w-full overflow-hidden rounded-[var(--radius-control)] bg-zinc-900">{children}</div>
    </motion.div>
  );
}
