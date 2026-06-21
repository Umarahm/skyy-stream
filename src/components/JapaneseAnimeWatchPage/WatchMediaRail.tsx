import styles from "./style.module.scss";
import MovieCardLarge from "@/components/MovieCardLarge";

type WatchMediaRailProps = {
  title: string;
  items: any[];
  emptyText: string;
};

const toLargeCardData = (media: any) => ({
  id: media?.id,
  title:
    media?.title?.english ||
    media?.title?.romaji ||
    media?.title?.native ||
    media?.title ||
    media?.name ||
    "Untitled",
  poster_path:
    media?.coverImage?.large || media?.coverImage?.extraLarge || media?.image,
  media_type: String(media?.type || media?.format || "anime").toLowerCase(),
  vote_average:
    typeof media?.averageScore === "number"
      ? media.averageScore / 10
      : typeof media?.meanScore === "number"
        ? media.meanScore / 10
        : null,
  release_date: media?.startDate?.year ? String(media.startDate.year) : "",
  original_language: media?.countryOfOrigin?.toLowerCase() || "jp",
  genre_ids: [],
});

const WatchMediaRail = ({ title, items, emptyText }: WatchMediaRailProps) => {
  return (
    <section className={styles.railPanel}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <div className={styles.railList}>
          {items.map((item) => {
            const media = item?.mediaRecommendation || item?.node || item;
            const cardData = toLargeCardData(media);
            return (
              <MovieCardLarge
                key={`${cardData.id}-${cardData.title}`}
                data={cardData}
                media_type={cardData.media_type}
                customHref={
                  cardData.id ? `/anime-details?id=${cardData.id}` : "#"
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default WatchMediaRail;
