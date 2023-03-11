import { memo } from "react";
import { twMerge } from "tailwind-merge";

export const ProgressBar = memo(function ProgressBar({
  progress,
}: {
  progress: number;
}) {
  const isComplete = progress >= 1;

  return (
    <div className="h-8 overflow-hidden rounded-lg bg-gray-fallback-7">
      <div
        style={{ width: `${progress * 100}%` }}
        className={twMerge(
          "h-full",
          isComplete ? "bg-green-solid" : "bg-red-solid"
        )}
      />
    </div>
  );
});
