import { memo, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface Props {
  className?: string;
  children?: ReactNode;
}

export const Panel = memo(function Panel({ className, children }: Props) {
  return (
    <div
      className={twMerge(
        "p-4 border rounded-lg bg-gray-bg-2 border-gray-border",
        className
      )}
    >
      {children}
    </div>
  );
});
