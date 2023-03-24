import { memo } from "react";
import { twMerge } from "tailwind-merge";

type Props = {
  label: string;
  color: "green" | "yellow";
  value: string;
} & (
  | {
      disabled: boolean;
      onClick: () => void;
    }
  | {
      disabled?: undefined;
      onClick?: undefined;
    }
);

export const StatusDisplay = memo(function StatusDisplay({
  label,
  color,
  value,
  disabled,
  onClick,
}: Props) {
  const blockClick = disabled || !onClick;

  return (
    <div className="flex items-center px-4 py-3 border rounded-lg gap-6 text-gray-text bg-gray-bg-2 border-gray-border">
      <p className="text-gray-text">{label}</p>
      <button
        className={twMerge(
          "grow rounded-lg px-2 py-1.5 border text-center",
          disabled && "opacity-50",
          blockClick && "pointer-events-none",
          color === "green" &&
            "bg-green-fallback-7 border-green-fallback-9 hover:bg-green-fallback-8 active:bg-green-fallback-9",
          color === "yellow" &&
            "bg-yellow-fallback-7 border-yellow-fallback-9 hover:bg-yellow-fallback-8 active:bg-yellow-fallback-9"
        )}
        disabled={blockClick}
        onClick={onClick}
      >
        {value}
      </button>
    </div>
  );
});
