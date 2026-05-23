import { cn } from "@/lib/cn";

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { height: string; fontSize: string }> = {
  sm: { height: "h-6", fontSize: "text-xl" },
  md: { height: "h-8", fontSize: "text-2xl" },
  lg: { height: "h-10", fontSize: "text-3xl" },
};

interface LogoProps {
  size?: LogoSize;
  invert?: boolean;
  className?: string;
}

export function Logo({ size = "md", invert = false, className }: LogoProps) {
  const { height, fontSize } = sizeMap[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-tight select-none",
        fontSize,
        height,
        className
      )}
      aria-label="signNGO"
    >
      <span style={{ color: invert ? "#FFFFFF" : "#0F172A" }}>sign</span>
      <span style={{ color: "#2563EB" }}>N</span>
      <span style={{ color: invert ? "#FFFFFF" : "#0F172A" }}>GO</span>
    </span>
  );
}
