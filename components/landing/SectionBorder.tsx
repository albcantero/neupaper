const hGradient = "linear-gradient(to right, var(--background) 12%, var(--border) 22%, var(--input) 38%, oklch(from var(--ring) l c h / 50%) 50%, var(--input) 62%, var(--border) 78%, var(--background) 88%)"

// Fade only in the extended parts (48px above/below), solid throughout the section
const vFadeGradient = "linear-gradient(to bottom, var(--background) 0px, var(--border) 96px, var(--input) 38%, oklch(from var(--ring) l c h / 50%) 50%, var(--input) 62%, var(--border) calc(100% - 96px), var(--background) 100%)"

export function HBorder() {
  return <div className="w-full h-px" style={{ background: hGradient }} />
}

/** Solid vertical lines — no fade */
export function VBorders({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-5xl mx-auto">
      {children}
      <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: "linear-gradient(to bottom, var(--border), var(--input) 38%, oklch(from var(--ring) l c h / 50%) 50%, var(--input) 62%, var(--border))" }} />
      <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: "linear-gradient(to bottom, var(--border), var(--input) 38%, oklch(from var(--ring) l c h / 50%) 50%, var(--input) 62%, var(--border))" }} />
    </div>
  )
}

/** Vertical lines with fade — extend 48px above/below the section */
export function VBordersFade({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-5xl mx-auto overflow-visible">
      {children}
      <div className="absolute -top-24 -bottom-24 left-0 w-px" style={{ background: vFadeGradient }} />
      <div className="absolute -top-24 -bottom-24 right-0 w-px" style={{ background: vFadeGradient }} />
    </div>
  )
}

const vFadeGradientFooter = "linear-gradient(to bottom, var(--background) 0px, var(--border) 48px, var(--input) 38%, oklch(from var(--ring) l c h / 50%) 50%, var(--input) 62%, var(--border) calc(100% - 24px), var(--background) 100%)"

/** Vertical lines with fade — shorter extension for footer */
export function VBordersFadeFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-5xl mx-auto overflow-visible">
      {children}
      <div className="absolute -top-12 -bottom-4 left-0 w-px" style={{ background: vFadeGradientFooter }} />
      <div className="absolute -top-12 -bottom-4 right-0 w-px" style={{ background: vFadeGradientFooter }} />
    </div>
  )
}
