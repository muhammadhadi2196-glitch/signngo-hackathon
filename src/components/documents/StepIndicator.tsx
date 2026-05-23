import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface Step {
  label: string;
}

interface Props {
  steps: Step[];
  current: number; // 0-based
}

export function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  done
                    ? "bg-green-500 border-green-500 text-white"
                    : active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-300 text-slate-400"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1 text-xs font-medium",
                  active ? "text-blue-600" : done ? "text-green-600" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 mx-1 mb-4",
                  i < current ? "bg-green-400" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
