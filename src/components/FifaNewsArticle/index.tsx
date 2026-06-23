import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import shellStyles from "@/components/SportsShell/style.module.scss";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { getEspnArticle, sanitizeEspnStoryHtml } from "@/Utils/sports";
import { formatDate } from "@/components/FifaNewsPage";
import { useReportFifaLoading } from "@/Utils/FifaLoadingContext";

const FifaNewsArticle = () => {
  const params = useSearchParams();
  const id = params.get("id") || "";

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useReportFifaLoading("news-article", loading);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    getEspnArticle(id).then((data) => {
      if (!active) return;
      setArticle(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className={shellStyles.message}>Loading article...</p>;
  }

  if (!article) {
    return (
      <div>
        <p className={shellStyles.message}>Article unavailable.</p>
        <Link href="/sports-fifa-news" className={styles.backLink}>
          ← Back to FIFA News
        </Link>
      </div>
    );
  }

  const storyHtml = sanitizeEspnStoryHtml(article.story);
  const sourceLink = article.links?.web?.href;

  return (
    <article className={styles.article}>
      <Link href="/sports-fifa-news" className={styles.backLink}>
        ← Back to FIFA News
      </Link>

      <LazyLoadImage
        src={article.images?.[0]?.url || "/images/logo.svg"}
        alt={article.headline}
        effect="opacity"
        className={`${styles.articleImage} skeleton`}
      />

      <p className={styles.articleDate}>
        {formatDate(article.published)}
        {article.byline ? ` · By ${article.byline}` : ""}
      </p>
      <h1 className={styles.articleHeadline}>{article.headline}</h1>

      {storyHtml ? (
        <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: storyHtml }} />
      ) : (
        article.description && <p className={styles.articleDescription}>{article.description}</p>
      )}

      {sourceLink && (
        <a href={sourceLink} target="_blank" rel="noopener noreferrer" className={styles.readFullStory}>
          View original on ESPN →
        </a>
      )}
    </article>
  );
};

export default FifaNewsArticle;
