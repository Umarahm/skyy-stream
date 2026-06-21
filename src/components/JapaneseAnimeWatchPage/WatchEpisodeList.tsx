import Link from "next/link";
import { useMemo, useState } from "react";
import { BsFillGrid3X3GapFill } from "react-icons/bs";
import { FaRegImage } from "react-icons/fa6";
import styles from "./style.module.scss";

type WatchEpisodeListProps = {
  animeId: string;
  title: string;
  episodesPayload: any;
  currentEpisode: number;
  selectedProvider: string;
  selectedType: string;
};

const pageSize = 100;

const toMode = (rawSubtype: string, streamType: string) => {
  const lowered = String(rawSubtype || "").toLowerCase();
  if (lowered.includes("embed")) return "embed";
  if (lowered.includes("dl")) return "dl";
  return String(streamType || "")
    .toLowerCase()
    .includes("embed")
    ? "embed"
    : "dl";
};

const toSubType = (rawSubtype: string, streamType: string) => {
  const lowered = String(rawSubtype || "").toLowerCase();
  if (lowered.includes("h-sub") || lowered.includes("s-sub")) return lowered;
  if (lowered.includes("h-dub") || lowered.includes("s-dub")) return lowered;
  if (lowered.includes("dub")) {
    return String(streamType || "")
      .toLowerCase()
      .includes("hls")
      ? "h-dub"
      : "s-dub";
  }
  return String(streamType || "")
    .toLowerCase()
    .includes("hls")
    ? "h-sub"
    : "s-sub";
};

const WatchEpisodeList = ({
  animeId,
  title,
  episodesPayload,
  currentEpisode,
  selectedProvider,
  selectedType,
}: WatchEpisodeListProps) => {
  const [rangeIndex, setRangeIndex] = useState(0);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "cards">("cards");

  const fallbackEpisodes = Array.isArray(episodesPayload?.episodes)
    ? episodesPayload.episodes
    : [];
  const providerData = episodesPayload?.providers?.[selectedProvider] || {};
  const providerGroups = useMemo(() => {
    const streamType = String(providerData?.streamType || "");
    const episodeCollections = providerData?.episodes || {};
    return Object.entries(episodeCollections)
      .map(([episodeTypeKey, episodesListRaw]: [string, any]) => {
        if (!Array.isArray(episodesListRaw) || episodesListRaw.length === 0)
          return null;
        const mode = toMode(episodeTypeKey, streamType);
        const subType = toSubType(episodeTypeKey, streamType);
        const audioHint = String(episodeTypeKey || "")
          .toLowerCase()
          .includes("dub")
          ? "dub"
          : "sub";
        return {
          key: `${selectedProvider}__${mode}__${subType}`,
          mode,
          subType,
          audioHint,
          episodes: episodesListRaw,
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      mode: string;
      subType: string;
      audioHint: string;
      episodes: any[];
    }>;
  }, [providerData, selectedProvider]);

  const selectedGroup = useMemo(() => {
    if (providerGroups.length === 0) return null;
    const preferred = providerGroups.find(
      (group) => group.audioHint === String(selectedType || "").toLowerCase(),
    );
    return preferred || providerGroups[0];
  }, [providerGroups, selectedType]);

  const activeEpisodes = selectedGroup?.episodes?.length
    ? selectedGroup.episodes
    : fallbackEpisodes;
  const hasEpisodes = activeEpisodes.length > 0;

  const episodeRanges = useMemo(() => {
    const ranges = [];
    for (let start = 0; start < activeEpisodes.length; start += pageSize) {
      const end = Math.min(activeEpisodes.length, start + pageSize);
      ranges.push({ start, end, label: `${start + 1}-${end}` });
    }
    return ranges;
  }, [activeEpisodes]);

  const activeRange = episodeRanges[rangeIndex] || {
    start: 0,
    end: Math.min(activeEpisodes.length, pageSize),
  };
  const searchedEpisodes = activeEpisodes.filter((ep: any) =>
    String(ep?.number || "").includes(episodeSearch.trim()),
  );
  const pagedEpisodes =
    episodeSearch.trim().length > 0
      ? searchedEpisodes
      : activeEpisodes.slice(activeRange.start, activeRange.end);

  if (!hasEpisodes) return null;

  return (
    <section className={styles.episodesPanel}>
      <h3>Episodes</h3>
      <div className={styles.episodeTopBar}>
        {episodeRanges.length > 0 ? (
          <select
            value={rangeIndex}
            onChange={(event) => setRangeIndex(Number(event.target.value))}
            className={styles.episodeRange}
            disabled={episodeSearch.trim().length > 0}
          >
            {episodeRanges.map((range, idx) => (
              <option key={range.label} value={idx}>
                {range.label}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="text"
          placeholder="Filter episodes..."
          value={episodeSearch}
          onChange={(event) => setEpisodeSearch(event.target.value)}
          className={styles.episodeFilter}
        />
        <div className={styles.episodeViewSwitch}>
          <button
            type="button"
            className={`${styles.viewIconBtn} ${viewMode === "cards" ? styles.viewIconBtnActive : ""}`}
            onClick={() => setViewMode("cards")}
            aria-label="Card view"
            title="Card view"
          >
            <FaRegImage />
          </button>
          <button
            type="button"
            className={`${styles.viewIconBtn} ${viewMode === "grid" ? styles.viewIconBtnActive : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            title="Grid view"
          >
            <BsFillGrid3X3GapFill />
          </button>
        </div>
      </div>

      <div
        className={
          viewMode === "grid" ? styles.episodeGridWrap : styles.episodeCardWrap
        }
      >
        {pagedEpisodes.map((ep: any) => {
          const epNumber = Number(ep?.number);
          const isActive = epNumber === currentEpisode;
          const href = `/anime-watch?id=${animeId}&ep=${epNumber}&title=${encodeURIComponent(title)}&provider=${selectedProvider}&mode=${selectedGroup?.mode || ""}&subType=${selectedGroup?.subType || selectedType}&episodeId=${encodeURIComponent(ep?.id || "")}`;

          return (
            <Link
              key={`${ep?.id || epNumber}`}
              href={href}
              className={`${styles.episode} ${viewMode === "cards" ? styles.episodeCard : styles.episodeGrid} ${ep?.filler ? styles.episodeFiller : ""} ${isActive ? styles.episodeActive : ""}`}
            >
              {viewMode === "cards" ? (
                <>
                  <div className={styles.episodeCardImageWrap}>
                    <img
                      src={ep?.image || "/images/logo.svg"}
                      alt={`Episode ${epNumber}`}
                      className={styles.episodeCardImage}
                      loading="lazy"
                    />
                    <span className={styles.episodeNumber}>EP {epNumber}</span>
                  </div>
                  <div className={styles.episodeCardContent}>
                    <span className={styles.episodeTitle}>
                      {ep?.title || `Episode ${epNumber}`}
                    </span>
                    <span className={styles.episodeMeta}>
                      <span className={styles.episodeMetaBadge}>
                        {ep?.filler ? "Filler" : "Canon"}
                      </span>
                      {ep?.airDate ? <span>{ep.airDate}</span> : null}
                    </span>
                  </div>
                </>
              ) : (
                <span className={styles.episodeNumber}>EP {epNumber}</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default WatchEpisodeList;
