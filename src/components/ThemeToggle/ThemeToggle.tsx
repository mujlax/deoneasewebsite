import { useEffect, useState } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={styles.button}
        aria-label="Загрузка темы"
        disabled
      >
        ...
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={toggleTheme}
      aria-label={
        theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"
      }
    >
      <span className={styles.label}>
        {theme === "light" ? "Светлая" : "Тёмная"}
      </span>
    </button>
  );
}

export default ThemeToggle;
