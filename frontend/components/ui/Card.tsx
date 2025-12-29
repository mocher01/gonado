"use client";

import { HTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "solid";
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-white/5 border border-white/10",
      glass: "bg-white/10 backdrop-blur-md border border-white/20",
      solid: "bg-slate-800 border border-slate-700",
    };

    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -4, scale: 1.02 } : undefined}
        className={cn(
          "rounded-xl p-6",
          variants[variant],
          hover && "cursor-pointer transition-shadow hover:shadow-xl",
          className
        )}
        {...(props as HTMLMotionProps<"div">)}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";
