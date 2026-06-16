import styles from "./style.module.scss";
import type { SourceItem } from "./types";

type WatchSourceListProps = {
  sources: SourceItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

const normalizeAudioType = (value: any): "sub" | "dub" | "unknown" => {
  const lowered = String(value || "").toLowerCase();
  if (lowered.includes("dub")) return "dub";
  if (lowered.includes("sub")) return "sub";
  return "unknown";
};

const WatchSourceList = ({ sources, selectedIndex, onSelect }: WatchSourceListProps) => {
  if (!sources.length) return null;

  return (
    <section className={styles.sourcesSection}>
      <h3>Sources</h3>
      <div className={styles.sourceCards}>
        {sources.map((source, idx) => {
          const isActive = selectedIndex === idx;
          const streamFormat = String(source?.streamFormat || "").toUpperCase() || "STREAM";
          const audioType = normalizeAudioType(source?.type).toUpperCase();
          return (
            <button
              key={`${source?.server || "source"}-${idx}`}
              type="button"
              className={`${styles.sourceCard} ${isActive ? styles.sourceCardActive : ""}`}
              onClick={() => onSelect(idx)}
            >
              <div className={styles.sourceCardTop}>
                <span className={styles.sourceServer}>{source?.server || `Source ${idx + 1}`}</span>
                <span className={styles.sourceBadge}>{streamFormat}</span>
              </div>
              <div className={styles.sourceCardMeta}>
                <span>{audioType}</span>
                <span>{isActive ? "Selected" : "Click to play"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default WatchSourceList;
