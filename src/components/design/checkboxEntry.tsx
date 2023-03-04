import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  size: "sm" | "lg";
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange?: () => void;
}

export const CheckboxEntry = memo(function CheckboxEntry({
  size,
  label,
  checked,
  disabled,
  onChange,
}: Props) {
  return (
    <label
      className={twMerge(
        "flex items-center rounded-lg cursor-pointer text-gray-text bg-gray-el-bg border border-gray-border hover:bg-gray-el-bg-hover active:bg-gray-el-bg-active",
        disabled && "opacity-50 pointer-events-none",
        size === "lg" && "p-4 gap-6 text-base",
        size === "sm" && "px-3 py-2 gap-5 text-sm"
      )}
    >
      <input
        type="checkbox"
        className={twMerge(
          "shrink-0 rounded-full appearance-none bg-red-solid checked:bg-green-solid",
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
