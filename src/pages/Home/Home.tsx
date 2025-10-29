import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/UI/Button";
import { Card } from "@/components/UI/Card";
import styles from "./Home.module.css";

const highlights = [
  {
    title: "Анимация и моушен",
    description:
      "Создаю динамичную графику для цифровых продуктов, рекламных кампаний и брендинга. От концепции до финального рендера.",
  },
  {
    title: "3D и визуализация",
    description:
      "Работаю с 3D-моделированием, рендерингом и визуализацией в Blender, Unreal Engine и Unity для создания впечатляющих визуальных эффектов.",
  },
  {
    title: "HTML баннеры",
    description:
      "Разрабатываю интерактивные HTML-баннеры, которые можно увидеть в браузере, на билбордах, вывесках в ТЦ и на других рекламных поверхностях.",
  },
];

export function HomePage() {
  return (
    <div className={styles.page}>
      <Helmet>
        <title>Denis Zablincev — Моушен дизайнер и 3D художник</title>
        <meta
          name="description"
          content="Моушен дизайнер и 3D художник из Ярославля. Создаю анимацию, 3D графику и HTML баннеры для брендов Яндекс, Т2, Авито."
        />
      </Helmet>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.overline}>Анимация / Моушен / 3D</span>
          <h1 className={styles.heading}>
            Создаю динамичную графику и визуальные эффекты
          </h1>
          <p className={styles.subheading}>
            Более 5 лет опыта в анимации, моушен дизайне и 3D. Работаю с After
            Effects, Blender, Adobe Animate, Unreal Engine, Marvelous Designer и
            Unity. Создаю графику для компаний Яндекс, Т2, Авито.
            <br />
            <br />
            Мои работы можно увидеть в браузере (HTML баннеры), на билбордах в
            городе, вывесках в ТЦ, ВДНХ, музее Терешковой и других рекламных
            поверхностях. Работаю в bono.digital в Ярославле.
          </p>
          <div className={styles.actions}>
            <Button as={Link} to="/news">
              Кейсы и заметки
            </Button>
            <Button variant="ghost" as={Link} to="/contacts">
              Связаться
            </Button>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.glow} />
          <div className={styles.badge}>
            5+ лет
            <span>опыта</span>
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        {highlights.map((highlight) => (
          <Card key={highlight.title} className={styles.card}>
            <h3>{highlight.title}</h3>
            <p>{highlight.description}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}

export default HomePage;
