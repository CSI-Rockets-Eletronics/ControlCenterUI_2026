import { memo } from "react";

interface Props {
  children?: string;
}

export const CodeBlock = memo(function CodeBlock({ children }: Props) {
  return (
    <div className="p-2 border border-gray-border rounded-md bg-gray-el-bg">
      <pre className="text-sm break-words whitespace-pre-wrap select-text text-gray-text">
        {children}
      </pre>
    </div>
  );
});
