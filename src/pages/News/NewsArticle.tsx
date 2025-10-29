import { Helmet } from "react-helmet-async";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams, Link } from "react-router-dom";
import { MDXProvider } from "@mdx-js/react";
import { Button } from "@/components/UI/Button";
import { Image } from "@/components/UI/Image";
import { normalizePath } from "@/utils/path";
import styles from "./NewsArticle.module.css";
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
const mdxModules = import.meta.glob("../../content/news/*.mdx");

export function NewsArticlePage() {
  const { slug = "" } = useParams<{ slug: string }>();

  const article = useMemo(
    () => newsItems.find((item) => item.slug === slug),
    [slug],
  );
  const [Content, setContent] = useState<ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setContent(null);
    setHasError(false);

    if (!article) {
      return;
    }

    const entry = Object.entries(mdxModules).find(([key]) =>
      key.endsWith(`${article.slug}.mdx`),
    );

    if (!entry) {
      setHasError(true);
      return;
    }

    setIsLoading(true);
    const loader = entry[1] as () => Promise<{ default: ComponentType }>;

    loader()
      .then((module) => {
        setContent(() => module.default);
      })
      .catch(() => {
        setHasError(true);
      })
      .finally(() => setIsLoading(false));
  }, [article]);

  if (!article) {
    return (
      <div className={styles.page}>
        <Helmet>
          <title>Материал не найден — Denis Zablincev</title>
        </Helmet>
        <h1>Материал не найден</h1>
        <p>
          Мы не нашли публикацию с таким идентификатором. Возможно, она скоро
          появится.
        </p>
        <Button as={Link} to="/news" variant="ghost">
          Вернуться к новостям
        </Button>
      </div>
    );
  }

  return (
    <article className={styles.page}>
      <Helmet>
        <title>{article.title} — Denis Zablincev</title>
        <meta name="description" content={article.description} />
      </Helmet>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link to="/news" className={styles.breadcrumb}>
            ← Назад к новостям
          </Link>
          <Button variant="ghost" as={Link} to={`/news/editor?slug=${slug}`}>
            Редактировать
          </Button>
        </div>
        <p className={styles.meta}>
          {new Date(article.date).toLocaleDateString("ru-RU", {
            dateStyle: "long",
          })}{" "}
          / {article.readingTime} мин чтения
        </p>
        <h1>{article.title}</h1>
        <p className={styles.description}>{article.description}</p>
        {article.tags && (
          <ul className={styles.tags}>
            {article.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
      </header>
      {article.cover && (
        <div className={styles.coverWrapper}>
          <Image
            className={styles.coverImage}
            src={article.cover}
            alt={article.coverAlt || `Обложка для ${article.title}`}
            rounded={false}
          />
        </div>
      )}
      <section className={styles.content}>
        {isLoading && <p>Загружаем контент...</p>}
        {hasError && !isLoading && (
          <p>
            Не удалось загрузить материал. Проверьте, сгенерирован ли MDX-файл.
          </p>
        )}
        {!isLoading && !hasError && Content && (
          <MDXProvider
            components={{
              img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
                <img
                  {...props}
                  src={props.src ? normalizePath(props.src) : props.src}
                />
              ),
            }}
          >
            <Content />
          </MDXProvider>
        )}
      </section>
    </article>
  );
}

export default NewsArticlePage;
