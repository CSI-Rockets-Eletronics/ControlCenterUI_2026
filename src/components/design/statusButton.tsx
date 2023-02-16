import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  status: "none" | "green" | "red";
  disabled?: boolean;
  onClick?: () => void;
  children?: string;
}

export const StatusButton = memo(function StatusButton({
  status,
  disabled = false,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      className={twMerge(
        "block p-2 rounded-lg border-2 bg-gray-el-bg hover:bg-gray-el-bg-hover active:bg-gray-el-bg-active disabled:opacity-50",
        disabled && "opacity-50 pointer-events-none",
        status === "none" && "text-gray-text",
        status === "green" && "text-green-solid",
        status === "red" && "text-red-solid"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
});
