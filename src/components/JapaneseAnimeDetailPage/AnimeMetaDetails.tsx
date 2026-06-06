import { useEffect, useMemo, useState } from "react";
import styles from "./meta.module.scss";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import { getMiruroDisplayTitle, getMiruroPoster } from "@/Utils/miruro";
import MovieCardLarge from "../MovieCardLarge";

const dummyList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const cleanDescription = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

const formatDate = (date: any) => {
  if (!date?.year) return "";
  const parts = [date?.day, date?.month, date?.year].filter(Boolean);
  return parts.join("/") || String(date?.year);
};

const toDateText = (date: any) => {
  if (!date?.year) return "";
  const month = String(date?.month || 1).padStart(2, "0");
  const day = String(date?.day || 1).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
};

const toMode = (rawSubtype: string, streamType: string) => {
  const lowered = rawSubtype.toLowerCase();
  if (lowered.includes("embed")) return "embed";
  if (lowered.includes("dl")) return "dl";
  return String(streamType || "").toLowerCase().includes("embed") ? "embed" : "dl";
};

const toSubType = (rawSubtype: string, streamType: string) => {
  const lowered = rawSubtype.toLowerCase();
  if (lowered.includes("h-sub") || lowered.includes("s-sub")) return lowered;
  if (lowered.includes("h-dub") || lowered.includes("s-dub")) return lowered;
  if (lowered.includes("dub")) {
    return String(streamType || "").toLowerCase().includes("hls") ? "h-dub" : "s-dub";
  }
  return String(streamType || "").toLowerCase().includes("hls") ? "h-sub" : "s-sub";
};

const toLargeCardData = (media: any) => ({
  id: media?.id,
  title: getMiruroDisplayTitle(media),
  poster_path: media?.coverImage?.large || media?.coverImage?.extraLarge,
  media_type: String(media?.type || "anime").toLowerCase(),
  vote_average:
    typeof media?.averageScore === "number"
      ? media.averageScore / 10
      : typeof media?.meanScore === "number"
        ? media.meanScore / 10
        : null,
  release_date: toDateText(media?.startDate),
  original_language: media?.countryOfOrigin?.toLowerCase() || "jp",
  genre_ids: [],
});

const formatCountdown = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Now streaming";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const AnimeMetaDetails = ({
  details,
  episodesPayload,
  animeId,
  loading = false,
}: {
  details: any;
  episodesPayload?: any;
  animeId?: string | null;
  loading?: boolean;
}) => {
  const [category, setCategory] = useState<
    "overview" | "episodes" | "recommended" | "relations" | "characters"
  >("overview");
  const [rangeIndex, setRangeIndex] = useState(0);
  const [providerIndex, setProviderIndex] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const pageSize = 100;
  const enabledProviders = ["kiwi", "moo", "ally"];
  const providerGroups = useMemo(() => {
    const providers = episodesPayload?.providers || {};
    const groups: any[] = [];
    Object.entries(providers).forEach(([providerName, providerDataRaw]: [string, any]) => {
      const normalizedProvider = String(providerName || "").toLowerCase();
      if (!enabledProviders.includes(normalizedProvider)) return;
      const providerData = providerDataRaw || {};
      const streamType = String(providerData?.streamType || "");
      const episodeCollections = providerData?.episodes || {};
      Object.entries(episodeCollections).forEach(([episodeTypeKey, episodesListRaw]: [string, any]) => {
        if (!Array.isArray(episodesListRaw) || episodesListRaw.length === 0) return;
        const mode = toMode(episodeTypeKey, streamType);
        const subType = toSubType(episodeTypeKey, streamType);
        groups.push({
          key: `${providerName}__${mode}__${subType}`,
          provider: normalizedProvider,
          mode,
          subType,
          label: `${providerName.toUpperCase()} • ${mode} • ${subType}`,
          episodes: episodesListRaw,
        });
      });
    });
    return groups;
  }, [episodesPayload]);

  useEffect(() => {
    if (providerGroups.length === 0) {
      setProviderIndex(0);
      return;
    }
    const preferredIndex = providerGroups.findIndex((group) =>
      String(group?.subType || "").toLowerCase().includes("h-sub"),
    );
    setProviderIndex(preferredIndex >= 0 ? preferredIndex : 0);
  }, [providerGroups]);

  const selectedProvider = providerGroups[providerIndex] || null;
  const fallbackEpisodes = details?.episodes?.episodes || [];
  const activeEpisodes = selectedProvider?.episodes || fallbackEpisodes;
  const totalEpisodeCount = activeEpisodes.length;
  const episodeRanges = useMemo(() => {
    const ranges = [];
    for (let start = 0; start < totalEpisodeCount; start += pageSize) {
      const end = Math.min(totalEpisodeCount, start + pageSize);
      ranges.push({
        start,
        end,
        label: `${start + 1}-${end}`,
      });
    }
    return ranges;
  }, [totalEpisodeCount]);
  const activeRange = episodeRanges[rangeIndex] || {
    start: 0,
    end: Math.min(totalEpisodeCount, pageSize),
  };
  const pagedEpisodes = useMemo(
    () =>
      activeEpisodes.slice(activeRange.start, activeRange.end),
    [activeEpisodes, activeRange],
  );
  const isMovie = /movie|film/i.test(String(details?.type || details?.format || ""));
  const animeSlug = details?.episodes?.slug || details?.slug || "";
  const detailTitle = getMiruroDisplayTitle(details) || details?.title || "Anime";
  const description = details?.description || details?.synopsis || "";
  const recommendations = details?.recommendations?.nodes || [];
  const relations = details?.relations?.edges || [];
  const characters = details?.characters?.edges || [];
  const studios = details?.studios?.nodes || [];
  const nextAiring = details?.nextAiringEpisode;
  const hasData = Boolean(details?.id || details?.title || details?.malId);
  const startDateText = formatDate(details?.startDate);
  const endDateText = formatDate(details?.endDate);
  const airedText =
    details?.aired ||
    details?.premiered ||
    (startDateText || endDateText ? `${startDateText}${startDateText && endDateText ? " - " : ""}${endDateText}` : "");
  const typeStatusText = [details?.format || details?.type, details?.status]
    .filter(Boolean)
    .join(" • ");
  const overviewRating =
    typeof details?.averageScore === "number"
      ? `${(details.averageScore / 10).toFixed(1)} / 10`
      : details?.rating || null;

  useEffect(() => {
    if (isMovie && category === "episodes") {
      setCategory("overview");
    }
  }, [isMovie, category]);

  useEffect(() => {
    if (!nextAiring?.airingAt) return;
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [nextAiring?.airingAt]);

  const airingInSeconds = nextAiring?.airingAt
    ? Math.floor((nextAiring.airingAt * 1000 - nowTs) / 1000)
    : null;
  const showNextAiring =
    Boolean(nextAiring?.episode) &&
    typeof airingInSeconds === "number" &&
    airingInSeconds > 0 &&
    airingInSeconds <= 60 * 60 * 24 * 7;

  return (
    <div className={styles.MetaDetailPage}>
      <div className={styles.MetaDetails}>
        <div className={styles.categoryNav}>
          <div className={styles.category}>
            <p
              className={`${category === "overview" ? styles.active : styles.inactive}`}
              onClick={() => setCategory("overview")}
            >
              Overview
            </p>
            <p
              className={`${category === "relations" ? styles.active : styles.inactive}`}
              onClick={() => setCategory("relations")}
            >
              Relations
            </p>
            <p
              className={`${category === "recommended" ? styles.active : styles.inactive}`}
              onClick={() => setCategory("recommended")}
            >
              Recommended
            </p>
            <p
              className={`${category === "characters" ? styles.active : styles.inactive}`}
              onClick={() => setCategory("characters")}
            >
              Characters
            </p>
          </div>
          {!isMovie ? (
            <p
              className={`${styles.categoryBlock} ${styles.episodesBlock} ${category === "episodes" ? styles.active : styles.inactive}`}
              onClick={() => setCategory("episodes")}
            >
              Episodes
            </p>
          ) : null}
        </div>

        {category === "overview" ? (
          <div className={styles.categoryDetails}>
            {loading || !hasData ? (
              <Skeleton count={10} style={{ margin: "0.5rem 0" }} />
            ) : (
              <>
                {showNextAiring ? (
                  <>
                    <h3>Next Airing Episode</h3>
                    <p>
                      Episode {nextAiring.episode} •{" "}
                      {new Date(nextAiring.airingAt * 1000).toLocaleString()}
                    </p>
                    <p className={styles.countdown}>
                      Streaming soon in {formatCountdown(airingInSeconds || 0)}
                    </p>
                  </>
                ) : null}

                {description ? (
                  <>
                    <h3>Synopsis</h3>
                    <p className={styles.preWrap}>{cleanDescription(description)}</p>
                  </>
                ) : null}

                {overviewRating || details?.averageScore || details?.malScore ? (
                  <>
                    <h3>Rating</h3>
                    <p className={styles.ratingRow}>
                      {overviewRating ? <span>{overviewRating}</span> : null}
                      {details?.averageScore || details?.malScore ? (
                        <>
                          {overviewRating ? <span>•</span> : null}
                          <img src="/icons/MAL_Logo.svg" alt="MAL" className={styles.malInlineLogo} />
                          <span>
                            {typeof details?.averageScore === "number"
                              ? (details.averageScore / 10).toFixed(1)
                              : details.malScore}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </>
                ) : null}

                {typeStatusText ? (
                  <>
                    <h3>Type & Status</h3>
                    <p>{typeStatusText}</p>
                  </>
                ) : null}

                {airedText ? (
                  <>
                    <h3>Aired</h3>
                    <p>{airedText}</p>
                  </>
                ) : null}

                {details?.duration ? (
                  <>
                    <h3>Duration</h3>
                    <p>{`${details.duration} min`}</p>
                  </>
                ) : null}

                {details?.genres?.length > 0 ? (
                  <>
                    <h3>Genres</h3>
                    <p>{details.genres.join(", ")}</p>
                  </>
                ) : null}

                {studios.length > 0 ? (
                  <>
                    <h3>Studios</h3>
                    <div className={styles.studioList}>
                      {studios.map((studio: any) => (
                        <a
                          key={`${studio?.id}-${studio?.name}`}
                          href={studio?.siteUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.studioItem}
                        >
                          <span>{studio?.name}</span>
                          <small>{studio?.isAnimationStudio ? "Animation Studio" : "Production"}</small>
                        </a>
                      ))}
                    </div>
                  </>
                ) : null}

                {startDateText || endDateText ? (
                  <>
                    <h3>Start / End</h3>
                    <p>
                      {startDateText}
                      {startDateText && endDateText ? " - " : ""}
                      {endDateText}
                    </p>
                  </>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {category === "recommended" ? (
          <div className={styles.largeCardList}>
            {loading ? (
              dummyList.map((item) => (
                <Skeleton key={item} height={120} style={{ margin: "0.5rem 0" }} />
              ))
            ) : (
              <>
                {recommendations.map((node: any) => {
                  const media = node?.mediaRecommendation || {};
                  const cardData = toLargeCardData(media);
                  return (
                    <MovieCardLarge
                      key={`${cardData.id}-${cardData.title}`}
                      data={cardData}
                      media_type={cardData.media_type}
                      customHref={cardData.id ? `/anime-details?id=${cardData.id}` : "#"}
                    />
                  );
                })}
                {recommendations.length === 0 ? <p>No recommendations found.</p> : null}
              </>
            )}
          </div>
        ) : null}

        {category === "relations" ? (
          <div className={styles.largeCardList}>
            {loading ? (
              dummyList.map((item) => (
                <Skeleton key={item} height={120} style={{ margin: "0.5rem 0" }} />
              ))
            ) : (
              <>
                {relations.map((edge: any) => {
                  const media = edge?.node || {};
                  const cardData = toLargeCardData(media);
                  return (
                    <div key={`${edge?.relationType}-${cardData.id}`} className={styles.relationCardWrap}>
                      <span className={styles.relationType}>{edge?.relationType || "RELATED"}</span>
                      <MovieCardLarge
                        data={cardData}
                        media_type={cardData.media_type}
                        customHref={cardData.id ? `/anime-details?id=${cardData.id}` : "#"}
                      />
                    </div>
                  );
                })}
                {relations.length === 0 ? <p>No related titles found.</p> : null}
              </>
            )}
          </div>
        ) : null}

        {category === "characters" ? (
          <div className={styles.cardGrid}>
            {loading ? (
              dummyList.map((item) => (
                <Skeleton key={item} height={90} style={{ margin: "0.5rem 0" }} />
              ))
            ) : (
              <>
                {characters.map((edge: any) => {
                  const character = edge?.node;
                  const charName =
                    character?.name?.full || character?.name?.native || character?.name || "Unknown";
                  return (
                    <div key={`${character?.id}-${charName}`} className={styles.metaCard}>
                      <img src={character?.image?.large || "/images/logo.svg"} alt={charName} />
                      <div>
                        <h4>{charName}</h4>
                        {edge?.role ? <p>{edge.role}</p> : null}
                      </div>
                    </div>
                  );
                })}
                {characters.length === 0 ? <p>No characters found.</p> : null}
              </>
            )}
          </div>
        ) : null}

        {category === "episodes" && !isMovie ? (
          <div className={styles.EpisodeList}>
            {loading ? (
              dummyList.map((item) => (
                <Skeleton key={item} height={64} style={{ margin: "0.5rem 0" }} />
              ))
            ) : (
              <>
            {providerGroups.length > 0 ? (
              <div className={styles.rangeSelector}>
                <label htmlFor="provider-group">Provider</label>
                <select
                  id="provider-group"
                  value={providerIndex}
                  onChange={(e) => {
                    setProviderIndex(Number(e.target.value));
                    setRangeIndex(0);
                  }}
                >
                  {providerGroups.map((group, idx) => (
                    <option key={group.key} value={idx}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {episodeRanges.length > 0 ? (
              <div className={styles.rangeSelector}>
                <label htmlFor="episode-range">Episodes</label>
                <select
                  id="episode-range"
                  value={rangeIndex}
                  onChange={(e) => setRangeIndex(Number(e.target.value))}
                >
                  {episodeRanges.map((range, idx) => (
                    <option key={range.label} value={idx}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className={styles.episodeGridWrap}>
              {pagedEpisodes.map((episode: any) => (
                <Link
                  key={`${episode?.id}-${episode?.number}`}
                  className={`${styles.episode} ${styles.episodeGrid} ${episode?.filler ? styles.episodeFiller : ""}`}
                  href={
                    animeId
                      ? `/anime-watch?id=${animeId}&ep=${episode?.number || 1}&title=${encodeURIComponent(detailTitle)}&provider=${selectedProvider?.provider || ""}&mode=${selectedProvider?.mode || ""}&subType=${selectedProvider?.subType || ""}&episodeId=${encodeURIComponent(episode?.id || "")}`
                      : animeSlug
                        ? `/anime-watch?slug=${animeSlug}&ep=${episode?.number || 1}`
                        : episode?.href && episode?.href !== "#"
                          ? episode?.href
                          : details?.watchUrl || "#"
                  }
                  target={
                    animeId || animeSlug
                      ? undefined
                      : episode?.href && episode?.href !== "#"
                        ? "_blank"
                        : undefined
                  }
                  rel={animeId || animeSlug ? undefined : "noreferrer"}
                >
                  <div className={styles.episodeTileHead}>
                    <span className={styles.episodeNumber}>{episode?.number}</span>
                  </div>
                </Link>
              ))}
            </div>
            {totalEpisodeCount === 0 ? <p>No episodes found.</p> : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AnimeMetaDetails;
