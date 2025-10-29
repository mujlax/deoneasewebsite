import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/", label: "Главная" },
  { to: "/news", label: "Новости" },
  { to: "/news/editor", label: "Редактор" },
  { to: "/contacts", label: "Контакты" },
];

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logo}>dz.</span>
        <span className={styles.title}>Denis Zablincev</span>
      </div>
      <div className={styles.actions}>
        <nav className={styles.nav} aria-label="Основная навигация">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default Header;
