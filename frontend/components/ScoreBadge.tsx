interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Not scored
      </span>
    );
  }

  const color =
    score >= 4
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 2
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  const sizeClass = size === "lg" ? "text-3xl px-4 py-2 rounded-xl" : size === "sm" ? "text-xs px-2 py-0.5 rounded-full" : "text-sm px-3 py-1 rounded-full";

  return (
    <span className={`inline-flex items-center font-semibold ${color} ${sizeClass}`}>
      {score}/5
    </span>
  );
}
