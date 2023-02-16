import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  size: "sm" | "lg";
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}

export const CheckboxEntry = memo(function CheckboxEntry({
  size,
  label,
  checked,
  disabled = false,
  onChange,
}: Props) {
  return (
    <label
      className={twMerge(
        "flex items-center border rounded-lg cursor-pointer text-gray-text bg-gray-el-bg border-gray-border hover:bg-gray-el-bg-hover active:bg-gray-el-bg-active",
        size === "lg" && "p-4 gap-6 text-base",
        size === "sm" && "px-3 py-2 gap-5 text-sm",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      <input
        type="checkbox"
        className={twMerge(
          "rounded-full appearance-none checked:bg-green-solid bg-red-solid shrink-0",
          size === "lg" && "w-8 h-8",
          size === "sm" && "w-6 h-6"
        )}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
});
