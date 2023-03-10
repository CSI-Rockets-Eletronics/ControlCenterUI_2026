import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  label: string;
  color: "green" | "yellow";
  value: string;
}

export const StatusDisplay = memo(function StatusDisplay({
  label,
  value,
  color,
}: Props) {
  return (
    <div className="flex items-center px-4 py-3 border rounded-lg gap-6 bg-gray-bg-2 border-gray-border">
      <p className="text-gray-text">{label}</p>
      <div
        className={twMerge(
          "grow rounded-lg px-2 py-1.5 border text-center",
          color === "green" && "bg-green-fallback-7 border-green-fallback-9",
          color === "yellow" && "bg-yellow-fallback-7 border-yellow-fallback-9"
        )}
      >
        <p className="text-gray-text">{value}</p>
      </div>
    </div>
  );
});
