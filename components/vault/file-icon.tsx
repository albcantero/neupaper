import { FileBox, FileCodeCorner, FileTypeCorner } from "lucide-react";

export function fileIcon(name: string, size?: "sm") {
  const cls = "shrink-0";
  const style = size === "sm" ? { width: "14px", height: "14px" } : undefined;
  if (name.endsWith(".isle")) return <FileBox className={cls} style={style} />;
  if (name.endsWith(".data")) return <FileCodeCorner className={cls} style={style} />;
  return <FileTypeCorner className={cls} style={style} />;
}
