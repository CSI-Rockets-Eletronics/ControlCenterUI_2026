import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  color: "gray" | "green" | "red";
  disabled: boolean;
  onClick?: () => void;
  children?: string;
}

export const Button = memo(function Button({
  color,
  disabled,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      className={twMerge(
        "block px-6 py-4 rounded-lg text-gray-text font-bold disabled:opacity-50",
        disabled && "opacity-50 pointer-events-none",
        color === "gray" &&
          "bg-gray-fallback-8 hover:bg-gray-fallback-9 active:bg-gray-fallback-10",
        color === "green" &&
          "bg-green-fallback-8 hover:bg-green-fallback-9 active:bg-green-fallback-10",
        color === "red" &&
          "bg-red-solid hover:bg-red-solid-hover active:bg-red-solid-active"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
});
