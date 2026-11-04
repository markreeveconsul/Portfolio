"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PropsWithChildren } from "react";

export function MotionSection({ children, className = "", id }: PropsWithChildren<{ className?: string; id?: string }>) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return <section id={id} className={className}>{children}</section>;
  return <motion.section id={id} className={className} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }}>{children}</motion.section>;
}
