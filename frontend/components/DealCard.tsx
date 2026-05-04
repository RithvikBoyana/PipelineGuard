import Link from "next/link";
import { FileText } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import type { Deal } from "@/lib/api";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const date = new Date(deal.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{deal.name}</p>
            {deal.company_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{deal.company_name}</p>
            )}
          </div>
          <ScoreBadge score={deal.overall_score} size="sm" />
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {deal.transcript_count} {deal.transcript_count === 1 ? "transcript" : "transcripts"}
          </span>
          <span>·</span>
          <span>{date}</span>
        </div>
      </div>
    </Link>
  );
}
