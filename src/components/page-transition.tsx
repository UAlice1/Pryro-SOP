"use client";

import { motion, useReducedMotion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  // Respect prefers-reduced-motion: skip animation entirely for users who need it
  const variants = reduced
    ? {
        hidden: { opacity: 1, y: 0 },
        enter:  { opacity: 1, y: 0 },
        exit:   { opacity: 1, y: 0 },
      }
    : {
        hidden: { opacity: 0, y: 10 },
        enter:  { opacity: 1,  y: 0  },
        exit:   { opacity: 0,  y: -6 },
      };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="enter"
      exit="exit"
      transition={{ duration: reduced ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      // Full height so content layout isn't affected during transition
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
