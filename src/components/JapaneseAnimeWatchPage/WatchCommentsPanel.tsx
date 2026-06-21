import { useEffect } from "react";
import styles from "./style.module.scss";

declare global {
  interface Window {
    theAnimeCommunityConfig?: Record<string, any>;
    theAnimeCommunity?: {
      reload?: () => void;
    };
  }
}

type WatchCommentsPanelProps = {
  malId?: string | number | null;
  aniListId?: string | number | null;
  episode: number;
};

const WatchCommentsPanel = ({
  malId,
  aniListId,
  episode,
}: WatchCommentsPanelProps) => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!malId && !aniListId) return;

    const config: Record<string, string> = {
      episodeChapterNumber: String(episode || 1),
      mediaType: "anime",
      removeBorder: "true",
    };
    if (malId) config.MAL_ID = String(malId);
    if (aniListId) config.AniList_ID = String(aniListId);

    window.theAnimeCommunityConfig = config;

    const mount = document.getElementById("anime-community-comment-section");
    if (!mount) return;
    mount.innerHTML = "";

    const currentScript = document.getElementById(
      "anime-community-script",
    ) as HTMLScriptElement | null;
    if (currentScript) {
      window.theAnimeCommunity?.reload?.();
      return;
    }

    const script = document.createElement("script");
    script.src = "/api/anime-community-embed";
    script.id = "anime-community-script";
    script.defer = true;
    mount.appendChild(script);
  }, [malId, aniListId, episode]);

  return (
    <section className={styles.commentsPanel}>
      <h3>Comments</h3>
      {!malId && !aniListId ? (
        <p className={styles.empty}>Comments unavailable for this title.</p>
      ) : (
        <div
          id="anime-community-comment-section"
          className={styles.commentsMount}
        />
      )}
    </section>
  );
};

export default WatchCommentsPanel;
