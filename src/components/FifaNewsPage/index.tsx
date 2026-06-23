import { useEffect, useState } from "react";
import Link from "next/link";
import shellStyles from "@/components/SportsShell/style.module.scss";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { SPORTS_CONFIG, getEspnNews } from "@/Utils/sports";
import { useReportFifaLoading } from "@/Utils/FifaLoadingContext";

const fifaConfig = SPORTS_CONFIG.football;

export type NewsArticle = {
  id: string;
  headline: string;
  description?: string;
  published?: string;
  image?: string;
  link?: string;
};

export const normalizeArticles = (articles: any[]): NewsArticle[] =>
  (articles || []).map((article: any, index: number) => ({
    id: String(article.id ?? index),
    headline: article.headline,
    description: article.description,
    published: article.published,
    image: article.images?.[0]?.url,
    link: article.links?.web?.href,
  }));

export const formatDate = (date?: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const FifaNewsPage = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useReportFifaLoading("news", loading);

  useEffect(() => {
    let active = true;
    getEspnNews(fifaConfig.espnSport, fifaConfig.espnLeague).then((data) => {
      if (!active) return;
      setArticles(normalizeArticles(data.articles));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className={shellStyles.header}>
        <h1>FIFA World Cup News</h1>
        <p>Latest headlines from around the tournament</p>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading news...</p>
      ) : articles.length === 0 ? (
        <p className={shellStyles.message}>No news articles found right now.</p>
      ) : (
        <div className={styles.newsGrid}>
          {articles.map((article) => (
            <Link key={article.id} href={`/sports-fifa-news-article?id=${article.id}`} className={styles.newsCard}>
              <LazyLoadImage
                src={article.image || "/images/logo.svg"}
                alt={article.headline}
                effect="opacity"
                className={`${styles.newsImage} skeleton`}
              />
              <div className={styles.newsBody}>
                <p className={styles.newsDate}>{formatDate(article.published)}</p>
                <h3>{article.headline}</h3>
                {article.description && <p className={styles.newsDescription}>{article.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export default FifaNewsPage;
