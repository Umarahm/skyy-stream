import { useEffect, useState } from "react";
import shellStyles from "@/components/SportsShell/style.module.scss";
import styles from "./style.module.scss";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { SPORTS_CONFIG, getSportsDbHighlights } from "@/Utils/sports";
import { useReportFifaLoading } from "@/Utils/FifaLoadingContext";

const HIGHLIGHTS_DAYS_BACK = 7;
const fifaLeagueId = SPORTS_CONFIG.football.sportsDbLeagueId;

type Highlight = { id: string; title: string; thumbnail?: string; videoId: string };

const extractYoutubeId = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const HighlightCard = ({ highlight }: { highlight: Highlight }) => {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={styles.highlightCard}>
      {playing ? (
        <div className={styles.highlightPlayer}>
          <iframe
            src={`https://www.youtube.com/embed/${highlight.videoId}?autoplay=1`}
            title={highlight.title}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      ) : (
        <button type="button" className={styles.highlightThumb} onClick={() => setPlaying(true)}>
          <LazyLoadImage
            src={highlight.thumbnail || "/images/logo.svg"}
            alt={highlight.title}
            effect="opacity"
            className="skeleton"
          />
          <span className={styles.playIcon}>▶</span>
        </button>
      )}
      <p className={styles.highlightTitle}>{highlight.title}</p>
    </div>
  );
};

const FifaHighlights = () => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useReportFifaLoading("highlights", loading);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const days = Array.from({ length: HIGHLIGHTS_DAYS_BACK }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return toDateString(d);
      });

      const results = await Promise.all(days.map((d) => getSportsDbHighlights(d, "Soccer")));
      if (!active) return;

      const merged: Highlight[] = results
        .flatMap((r) => r.tvhighlights || [])
        .filter((item: any) => String(item.idLeague) === String(fifaLeagueId))
        .map((item: any): Highlight | null => {
          const videoId = extractYoutubeId(item.strVideo);
          if (!videoId) return null;
          return {
            id: String(item.idHighlight || `${item.idEvent}-${videoId}`),
            title: item.strEvent || "FIFA World Cup Highlight",
            thumbnail: item.strThumb || item.strPoster || undefined,
            videoId,
          };
        })
        .filter((item): item is Highlight => Boolean(item));

      setHighlights(merged);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className={shellStyles.header}>
        <h1>FIFA World Cup Highlights</h1>
        <p>Watch recent match highlights</p>
      </div>

      {loading ? (
        <p className={shellStyles.message}>Loading highlights...</p>
      ) : highlights.length === 0 ? (
        <p className={shellStyles.message}>No highlights found for the last {HIGHLIGHTS_DAYS_BACK} days.</p>
      ) : (
        <div className={styles.highlightsGrid}>
          {highlights.map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} />
          ))}
        </div>
      )}
    </>
  );
};

export default FifaHighlights;
