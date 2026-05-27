"use client"

import React from "react"
import { motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

const animationProps: MotionProps = {
  initial: { "--x": "100%", scale: 0.98 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
} as unknown as MotionProps

interface ShinyButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps>,
    MotionProps {
  children: React.ReactNode
  className?: string
}

export const ShinyButton = React.forwardRef<
  HTMLButtonElement,
  ShinyButtonProps
>(({ children, className, disabled, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      className={cn(
        "relative cursor-pointer rounded-full border border-border/60 px-4 py-1.5 font-medium backdrop-blur-xl transition-shadow duration-300 ease-in-out hover:shadow dark:bg-[radial-gradient(circle_at_50%_0%,var(--accent)/15%_0%,transparent_60%)] dark:hover:shadow-[0_0_20px_var(--accent)/10%] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...animationProps}
      {...props}
    >
      <span
        className="relative block size-full text-xs tracking-wide text-foreground/80 uppercase dark:font-medium dark:text-foreground"
        style={{
          maskImage:
            "linear-gradient(-75deg,var(--accent) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--accent) calc(var(--x) + 100%))",
          WebkitMaskImage:
            "linear-gradient(-75deg,var(--accent) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--accent) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,var(--accent)/10% calc(var(--x)+20%),var(--accent)/50% calc(var(--x)+25%),var(--accent)/10% calc(var(--x)+100%))",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] p-px"
      />
    </motion.button>
  )
})

ShinyButton.displayName = "ShinyButton"
