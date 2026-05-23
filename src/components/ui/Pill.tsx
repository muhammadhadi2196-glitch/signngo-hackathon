import { cn } from "@/lib/cn";

type PillVariant = "draft" | "sent" | "viewed" | "completed" | "overdue";

const pillMap: Record<PillVariant, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const labelMap: Record<PillVariant, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  completed: "Completed",
  overdue: "Overdue",
};

interface PillProps {
  variant: PillVariant;
  label?: string;
  className?: string;
}

export function Pill({ variant, label, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        pillMap[variant],
        className
      )}
    >
      {label ?? labelMap[variant]}
    </span>
  );
}
