import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  color: "none" | "green" | "red";
  disabled: boolean;
  onClick?: () => void;
  children?: string;
}

export const StatusButton = memo(function StatusButton({
  color,
  disabled,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      className={twMerge(
        "block px-4 py-2 rounded-lg border-2 bg-gray-el-bg hover:bg-gray-el-bg-hover active:bg-gray-el-bg-active disabled:opacity-50",
        disabled && "opacity-50 pointer-events-none",
        color === "none" && "text-gray-text",
        color === "green" && "text-green-solid",
        color === "red" && "text-red-solid"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
});
