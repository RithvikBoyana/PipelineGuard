import { CheckCircle, XCircle } from "lucide-react";
import type { AnalysisResult } from "@/lib/api";

const SIGNAL_LABELS: Record<string, string> = {
  decision_maker: "Decision Maker",
  problem_articulation: "Problem Articulation",
  budget_authority: "Budget Authority",
  urgency: "Urgency",
  next_steps: "Next Steps",
};

interface SignalBreakdownProps {
  analysis: AnalysisResult;
}

export function SignalBreakdown({ analysis }: SignalBreakdownProps) {
  return (
    <div className="space-y-3">
      {Object.entries(analysis.signals).map(([key, signal]) => (
        <div key={key} className="flex items-start gap-3">
          {signal.present ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{SIGNAL_LABELS[key] ?? key}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{signal.reasoning}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
