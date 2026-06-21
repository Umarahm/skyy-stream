import Link from "next/link";
import styles from "./style.module.scss";
import { AniListMedia } from "@/Utils/anilist";

const JapaneseMediaCard = ({
  media,
  mediaType,
}: {
  media: AniListMedia;
  mediaType: "anime" | "manga";
}) => {
  const title =
    media?.title?.english ||
    media?.title?.romaji ||
    media?.title?.native ||
    "N/A";

  return (
    <Link
      href={`/${mediaType}-detail?id=${media?.id}`}
      className={styles.card}
      data-tooltip-id="tooltip"
      data-tooltip-content={title}
    >
      <img
        src={media?.coverImage?.large || "/images/logo.svg"}
        alt={title}
        loading="lazy"
      />
      <div className={styles.meta}>
        <h4>{title}</h4>
        <p>
          {media?.averageScore ? `${media.averageScore}%` : "Unrated"}
          {mediaType === "anime" && media?.episodes
            ? ` • ${media.episodes} ep`
            : null}
          {mediaType === "manga" && media?.chapters
            ? ` • ${media.chapters} ch`
            : null}
        </p>
      </div>
    </Link>
  );
};

export default JapaneseMediaCard;
