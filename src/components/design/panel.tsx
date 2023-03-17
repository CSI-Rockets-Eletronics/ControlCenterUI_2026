import { memo, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  color?: "gray" | "red" | "yellow" | "green";
  className?: string;
  children?: ReactNode;
}

export const Panel = memo(function Panel({
  color = "gray",
  className,
  children,
}: Props) {
  return (
    <div
      className={twMerge(
        "p-4 border rounded-lg",
        color === "gray" && "bg-gray-bg-2 border-gray-border",
        color === "red" && "bg-red-bg-2 border-red-border",
        color === "yellow" && "bg-yellow-bg-2 border-yellow-border",
        color === "green" && "bg-green-bg-2 border-green-border",
        className
      )}
    >
      {children}
    </div>
  );
});
