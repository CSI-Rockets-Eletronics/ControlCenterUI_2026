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
          "bg-gray-solid hover:bg-gray-solid-hover active:bg-gray-solid-active",
        color === "green" &&
          "bg-green-solid hover:bg-green-solid-hover active:bg-green-solid-active",
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
