import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  label: string;
  value: boolean;
}

export const BooleanDisplay = memo(function BooleanDisplay({
  label,
  value,
}: Props) {
  return (
    <div className="flex items-center px-3 py-2 border rounded-lg gap-4 bg-gray-bg-2 border-gray-border">
      <div
        className={twMerge(
          "rounded-full shrink-0 w-8 h-8",
          value ? "bg-green-solid" : "bg-red-solid"
        )}
      />
      <p className="text-gray-text">{label}</p>
    </div>
  );
});
