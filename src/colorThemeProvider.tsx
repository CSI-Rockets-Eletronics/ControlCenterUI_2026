import * as radixColors from "@radix-ui/colors";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const BASE_RADIX_COLORS = Object.keys(radixColors).filter(
  (color) => !color.endsWith("Dark") && !color.endsWith("A"),
);

const ColorThemeContext = createContext({
  isDark: true,
  toggleDark: () => undefined as void,
});

function isSystemDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const ColorThemeProvider = memo(function ColorThemeProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const [isDark, setIsDark] = useState(isSystemDarkMode());

  const toggleDark = useCallback(() => {
    setIsDark((isDark) => !isDark);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "i") {
        setIsDark(!isDark);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      return window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDark]);

  const style = useMemo(() => {
    const innerStyles: string[] = [];

    for (const colorName of BASE_RADIX_COLORS) {
      const mappedColorName = isDark ? `${colorName}Dark` : colorName;

      if (mappedColorName in radixColors) {
        const color = radixColors[mappedColorName as keyof typeof radixColors];
        for (const [stepName, stepColor] of Object.entries(color)) {
          const stepNum = stepName.replace(/[^\d]+/, "");
          // strip hsl to be compatible with Tailwind's opacity modifier
          const stepColorNoHsl = stepColor.replace(
            /hsl\((\S+), (\S+), (\S+)\)/,
            "$1 $2 $3",
          );
          innerStyles.push(
            `--radix-color-${colorName}-${stepNum}: ${stepColorNoHsl};`,
          );
        }
      }
    }

    return `body { ${innerStyles.join(" ")} }`;
  }, [isDark]);

  const colorThemeContextValue = useMemo(
    () => ({
      isDark,
      toggleDark,
    }),
    [isDark, toggleDark],
  );

  return (
    <ColorThemeContext.Provider value={colorThemeContextValue}>
      <style>{style}</style>
      {children}
    </ColorThemeContext.Provider>
  );
});

export function useColorTheme() {
  return useContext(ColorThemeContext);
}
