import { useState, useEffect } from "react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Закрываем меню при изменении размера окна (переход с мобильного на десктоп)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
              onClick={closeMobileMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Открыть меню"
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.hamburger}>
            <span
              className={`${styles.hamburgerLine} ${
                isMobileMenuOpen ? styles.hamburgerLineOpen : ""
              }`}
            />
            <span
              className={`${styles.hamburgerLine} ${
                isMobileMenuOpen ? styles.hamburgerLineOpen : ""
              }`}
            />
            <span
              className={`${styles.hamburgerLine} ${
                isMobileMenuOpen ? styles.hamburgerLineOpen : ""
              }`}
            />
          </span>
        </button>
      </div>
      {isMobileMenuOpen && (
        <nav className={styles.mobileNav} aria-label="Мобильная навигация">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive
                  ? `${styles.mobileLink} ${styles.mobileLinkActive}`
                  : styles.mobileLink
              }
              end={item.to === "/"}
              onClick={closeMobileMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

export default Header;
