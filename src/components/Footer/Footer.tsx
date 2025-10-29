import styles from "./Footer.module.css";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p className={styles.copy}>
        © {currentYear} Denis Zablincev. Все права защищены.
      </p>
      <p className={styles.note}>
        Сделано с вниманием к деталям и доступности.
      </p>
    </footer>
  );
}

export default Footer;
