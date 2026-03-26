"use client";

import { cn } from "@/lib/utils";

interface Button3DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "light" | "dark" | "ghost";
}

const variants = {
  light: {
    edge: "linear-gradient(to left, #b0b2c8 0%, #c8cad8 8%, #c8cad8 92%, #b0b2c8 100%)",
    front: "bg-[#f8f8fd]",
    text: "text-[#1a1535]",
  },
  dark: {
    edge: "linear-gradient(to left, #0a0c14 0%, #1a1c28 8%, #1a1c28 92%, #0a0c14 100%)",
    front: "bg-[#0f1120]",
    text: "text-[#e8e8f8]",
  },
  ghost: {
    edge: "linear-gradient(to left, oklch(20% 0.015 262) 0%, oklch(24% 0.018 262) 8%, oklch(24% 0.018 262) 92%, oklch(20% 0.015 262) 100%)",
    front: "bg-transparent border border-[oklch(40%_0.03_262)]",
    text: "text-[#e8e8f8]",
  },
};

export function Button3D({ children, className, variant = "light", ...props }: Button3DProps) {
  const v = variants[variant];

  return (
    <button
      className={cn(
        "btn3d group relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 select-none touch-manipulation",
        "transition-[filter] duration-[250ms] hover:brightness-110",
        className
      )}
      {...props}
    >
      {/* Shadow */}
      <span
        className="absolute inset-0 rounded-md will-change-transform"
        style={{
          background: "hsl(0deg 0% 0% / 0.25)",
          transform: "translateY(2px)",
          transition: "transform 600ms cubic-bezier(.3, .7, .4, 1)",
        }}
      />
      {/* Edge */}
      <span
        className="absolute inset-0 rounded-md"
        style={{ background: v.edge }}
      />
      {/* Front */}
      <span
        className={cn(
          "block relative rounded-sm px-3 py-1 will-change-transform",
          v.front,
          v.text,
          "[transform:translateY(-4px)] [transition:transform_600ms_cubic-bezier(.3,.7,.4,1)]",
          "group-hover:[transform:translateY(-6px)] group-hover:[transition:transform_250ms_cubic-bezier(.3,.7,.4,1.5)]",
          "group-active:[transform:translateY(-2px)] group-active:[transition:transform_34ms]",
        )}
      >
        {children}
      </span>

      <style>{`
        .btn3d:hover > span:first-child { transform: translateY(4px); transition: transform 250ms cubic-bezier(.3, .7, .4, 1.5); }
        .btn3d:active > span:first-child { transform: translateY(1px); transition: transform 34ms; }
      `}</style>
    </button>
  );
}
