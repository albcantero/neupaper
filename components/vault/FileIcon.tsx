import { FileBox, FileCodeCorner } from "lucide-react";

function FileMdIcon({ className, style, strokeWidth = 2 }: { className?: string; style?: React.CSSProperties; strokeWidth?: number }) {
  // Scale strokeWidth from Lucide space (viewBox 24) to this SVG's space (viewBox 100)
  const sw = strokeWidth * (100 / 24);
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} className={className} style={style}>
      <path d="M21.006,50l0,-33.333c0,-4.572 3.762,-8.333 8.333,-8.333l33.333,0c2.666,-0.007 5.227,1.053 7.108,2.942l14.95,14.95c1.888,1.882 2.948,4.442 2.942,7.108l0,50c0,4.572 -3.762,8.333 -8.333,8.333" />
      <path d="M62.672,8.333l0,20.833c0,2.286 1.881,4.167 4.167,4.167l20.833,0" />
      <path d="M52.801,61.25l0,25.755l7.359,0c7.064,0 12.878,-5.813 12.878,-12.878c0,-7.064 -5.813,-12.878 -12.878,-12.878l-7.359,0Z" />
      <path d="M38.083,87.005l0,-25.755l-12.878,18.397l-12.878,-18.397l0,25.755" />
    </svg>
  );
}

export function fileIcon(name: string, size?: "sm") {
  const cls = "shrink-0";
  const style = size === "sm" ? { width: "14px", height: "14px" } : undefined;
  const sw = size === "sm" ? 2 : 1.75;
  if (name.endsWith(".isle")) return <FileBox className={cls} style={style} strokeWidth={sw} />;
  if (name.endsWith(".data")) return <FileCodeCorner className={cls} style={style} strokeWidth={sw} />;
  return <FileMdIcon className={cls} style={style} strokeWidth={sw} />;
}
