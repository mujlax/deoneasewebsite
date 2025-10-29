import { Helmet } from "react-helmet-async";
import { Button } from "@/components/UI/Button";
import styles from "./Contacts.module.css";

const channels = [
  {
    label: "Email",
    value: "hello@deniszablincev.com",
    href: "mailto:hello@deniszablincev.com",
  },
  {
    label: "Telegram",
    value: "@denizz",
    href: "https://t.me/denizz",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/deniszablincev",
    href: "https://www.linkedin.com/in/deniszablincev",
  },
];

export function ContactsPage() {
  return (
    <div className={styles.page}>
      <Helmet>
        <title>Свяжитесь со мной — Denis Zablincev</title>
        <meta
          name="description"
          content="Удобные способы быстро связаться с Денисом Заблинцевым."
        />
      </Helmet>

      <section className={styles.hero}>
        <h1>Связаться</h1>
        <p>
          Предпочитаю структурированные запросы: расскажите о компании, задачах
          и сроках. Отвечаю в течение двух будних дней.
        </p>
      </section>

      <section className={styles.grid}>
        {channels.map((channel) => (
          <a key={channel.label} href={channel.href} className={styles.card}>
            <span className={styles.label}>{channel.label}</span>
            <span className={styles.value}>{channel.value}</span>
          </a>
        ))}
      </section>

      <section className={styles.cta}>
        <h2>Есть готовый бриф?</h2>
        <p>
          Отправьте PDF или ссылку на документ по email. Используйте тему письма
          «Проект / {new Date().getFullYear()}».
        </p>
        <Button
          as="a"
          href="mailto:hello@deniszablincev.com?subject=%D0%9F%D1%80%D0%BE%D0%B5%D0%BA%D1%82%20%C2%B7%20"
        >
          Написать письмо
        </Button>
      </section>
    </div>
  );
}

export default ContactsPage;
