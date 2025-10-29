import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card } from "@/components/UI/Card";
import { Button } from "@/components/UI/Button";
import { Image } from "@/components/UI/Image";
import styles from "./News.module.css";
import newsIndex from "@/content/news/index.json";

type NewsItem = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: number;
  cover?: string;
  coverAlt?: string;
  tags?: string[];
};

const newsItems = newsIndex as NewsItem[];

export function NewsPage() {
  return (
    <div className={styles.page}>
      <Helmet>
        <title>Новости и заметки — Denis Zablincev</title>
        <meta
          name="description"
          content="Новости, продуктовые заметки и кейсы Дениса Заблинцева."
        />
      </Helmet>

      <header className={styles.header}>
        <div>
          <h1>Новости</h1>
          <p>Подборка заметок о продуктах, дизайне и фронтенд-инженерии.</p>
        </div>
        <Button as={Link} to="/news/editor">
          Создать запись
        </Button>
      </header>

      <section className={styles.list}>
        {newsItems.map((item) => (
          <Link
            key={item.slug}
            to={`/news/${item.slug}`}
            className={styles.cardLink}
          >
            <Card className={styles.card}>
              {item.cover && (
                <div className={styles.coverLink}>
                  <Image
                    className={styles.cover}
                    src={item.cover}
                    alt={item.coverAlt || `Обложка ${item.title}`}
                  />
                </div>
              )}
              <div className={styles.meta}>
                <span>{new Date(item.date).toLocaleDateString("ru-RU")}</span>
                <span> / </span>
                <span>{item.readingTime} мин чтения</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.tags && (
                <ul className={styles.tags}>
                  {item.tags.map((tag) => (
                    <li key={tag}>#{tag}</li>
                  ))}
                </ul>
              )}
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}

export default NewsPage;
