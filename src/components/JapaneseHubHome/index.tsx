import { useEffect, useRef, useState } from "react";
import {
  getMiruroDisplayTitle,
  getMiruroMediaLabel,
  getMiruroPopular,
  getMiruroPoster,
  getMiruroSpotlight,
  getMiruroTrending,
  getMiruroUpcoming,
} from "@/Utils/miruro";
import MovieCardSmall from "@/components/MovieCardSmall";
import AnimeSchedule from "@/components/AnimeSchedule";
import styles from "./style.module.scss";
import Link from "next/link";
import Carousel from "@/components/Carousel";
import Skeleton from "react-loading-skeleton";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { setHub } from "@/Utils/settings";
import { useRouter } from "next/navigation";
import axiosFetch from "@/Utils/fetchBackend";

// ── TMDB helpers (identical logic to anime-details page) ─────────────────────

const getTmdbImageUrl = (path?: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_TMBD_IMAGE_URL}${path}` : "";

const isLikelyAnimeTmdbResult = (item: any) =>
  item?.original_language === "ja" &&
  Array.isArray(item?.genre_ids) &&
  item.genre_ids.includes(16);

const sanitizeTitleForTmdb = (rawTitle: string) =>
  String(rawTitle || "")
    .replace(/\b(the\s+)?final\s+season\b/gi, " ")
    .replace(/\bseason\s*\d+\b/gi, " ")
    .replace(/\b(s|season)\s*[ivxlcdm]+\b/gi, " ")
    .replace(/\bpart\s*\d+\b/gi, " ")
    .replace(/\bcour\s*\d+\b/gi, " ")
    .replace(/\b[ivxlcdm]{1,6}\b/gi, " ")
    .replace(/\b\d+(st|nd|rd|th)?\s+season\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/[()\-_:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findAnimeTmdbMatch = async (title: string) => {
  const searches = [title, `${title} anime`];
  for (const query of searches) {
    const searchRes: any = await axiosFetch({ requestID: "searchMulti", query, page: 1 });
    const results = (searchRes?.results || []).filter(
      (item: any) =>
        (item?.media_type === "tv" || item?.media_type === "movie") &&
        (item?.backdrop_path || item?.id),
    );
    const match =
      results.find((item: any) => item?.media_type === "tv" && isLikelyAnimeTmdbResult(item)) ||
      results.find(isLikelyAnimeTmdbResult);
    if (match) return match;
  }
  return null;
};

// Returns exactly ONE backdrop URL per anime (same images as detail page uses)
const getBestTmdbBackdrop = async (match: any): Promise<string> => {
  if (!match?.id || !match?.media_type) return getTmdbImageUrl(match?.backdrop_path);
  const response = await axiosFetch({
    requestID: `${match.media_type}Images`,
    id: String(match.id),
  });
  const first = response?.backdrops?.[0]?.file_path;
  return first ? getTmdbImageUrl(first) : getTmdbImageUrl(match?.backdrop_path);
};

// ── Lazy-fetch hook ──────────────────────────────────────────────────────────

function useLazyFetch<T>(
  fetcher: () => Promise<T>,
  sentinelRef: React.RefObject<HTMLDivElement | null>,
): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fetchedRef.current) return;
        fetchedRef.current = true;
        observer.disconnect();
        setLoading(true);
        fetcher()
          .then((res) => { setData(res); setLoading(false); })
          .catch(() => setLoading(false));
      },
      { rootMargin: "400px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}

// ── Component ────────────────────────────────────────────────────────────────

const SKELETON_ITEMS = [1, 2, 3, 4, 5, 6];

const JapaneseHubHome = () => {
  const { push } = useRouter();
  const [heroSlides, setHeroSlides] = useState<Array<{ item: any; image: string }>>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  // One sentinel ref per data source
  const trendingRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);
  const upcomingRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const { data: trendingData, loading: trendingLoading } = useLazyFetch(
    () => getMiruroTrending().then((r) => r?.results || []),
    trendingRef,
  );
  const { data: popularData, loading: popularLoading } = useLazyFetch(
    () => getMiruroPopular().then((r) => r?.results || []),
    popularRef,
  );
  const { data: upcomingData, loading: upcomingLoading } = useLazyFetch(
    () => getMiruroUpcoming().then((r) => r?.results || []),
    upcomingRef,
  );
  const { data: spotlightData, loading: spotlightLoading } = useLazyFetch(
    () => getMiruroSpotlight().then((r) => r?.results || []),
    spotlightRef,
  );

  const trending = trendingData || [];
  const popular = popularData || [];
  const upcoming = upcomingData || [];
  const spotlight = spotlightData || [];

  // Build hero carousel: one TMDB backdrop per trending anime, no miruro fallback
  useEffect(() => {
    if (!trending.length) return;
    let cancelled = false;

    (async () => {
      try {
        setHeroLoading(true);
        const slides: Array<{ item: any; image: string }> = [];
        for (const item of trending.slice(0, 8)) {
          if (cancelled) return;
          const title = sanitizeTitleForTmdb(getMiruroDisplayTitle(item));
          if (!title) continue;
          const match = await findAnimeTmdbMatch(title);
          if (cancelled) return;
          if (!match) continue;
          const image = await getBestTmdbBackdrop(match);
          if (cancelled) return;
          if (image) slides.push({ item, image });
        }
        if (!cancelled && slides.length > 0) setHeroSlides(slides);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setHeroLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [trending]);

  const getId = (item: any) => item?.id || item?.malId || item?._id;
  const detailHref = (item: any) => {
    const id = getId(item);
    return id ? `/anime-details?id=${id}` : "/anime";
  };
  const toCardData = (item: any) => ({
    id: getId(item) || getMiruroDisplayTitle(item),
    name: getMiruroDisplayTitle(item),
    title: getMiruroDisplayTitle(item),
    poster_path: getMiruroPoster(item),
    mediaLabel: getMiruroMediaLabel(item),
  });

  const hero = heroSlides[heroIndex]?.item ?? heroSlides[0]?.item;
  const heroImages = heroSlides.map((s) => s.image);
  const heroTitle = hero ? getMiruroDisplayTitle(hero) : "";
  const heroTitleLen = heroTitle.length;
  const heroTitleClass =
    heroTitleLen > 70 ? styles.titleXs
    : heroTitleLen > 50 ? styles.titleSm
    : heroTitleLen > 35 ? styles.titleMd
    : styles.titleLg;

  const renderSection = (
    label: string,
    list: any[],
    loading: boolean,
    sentinelRef: React.RefObject<HTMLDivElement | null> | null,
    globalIndex: number,
  ) => (
    <section className={styles.section} key={label}>
      {sentinelRef && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
      <h1>
        {label}
        <div>
          <MdChevronLeft
            onClick={() => {
              document.querySelectorAll(`.${styles.HomeListSection}`)[globalIndex]?.scrollBy(-700, 0);
            }}
            data-tooltip-id="tooltip"
            data-tooltip-content="Swipe Left"
          />
          swipe
          <MdChevronRight
            onClick={() => {
              document.querySelectorAll(`.${styles.HomeListSection}`)[globalIndex]?.scrollBy(700, 0);
            }}
            data-tooltip-id="tooltip"
            data-tooltip-content="Swipe Right"
          />
        </div>
      </h1>
      <div className={styles.HomeListSection}>
        {loading && SKELETON_ITEMS.map((n) => <Skeleton key={n} className={styles.loading} />)}
        {!loading && list.length === 0 && (
          <p className={styles.emptyMessage}>No titles found.</p>
        )}
        {list.map((item: any) => {
          const mapped = toCardData(item);
          return (
            <MovieCardSmall
              key={`${label}-${mapped.id}`}
              data={mapped}
              media_type="tv"
              customHref={detailHref(item)}
            />
          );
        })}
      </div>
    </section>
  );

  return (
    <div className={styles.page}>
      <section className={styles.HomeHero}>
        <button
          type="button"
          className={`${styles.changeHubBtn} btn`}
          onClick={() => { setHub(""); push("/"); }}
        >
          Change Hub
        </button>
        <div className={styles.HomeCarousel}>
          {heroImages.length > 0 ? (
            <Carousel
              imageArr={heroImages}
              setIndex={setHeroIndex}
              mobileHeight="60vh"
              desktopHeight="80vh"
              objectFit="cover"
            />
          ) : (heroLoading || trendingLoading) ? (
            <Skeleton className={styles.CarouselLoading} />
          ) : null}
          <div className={styles.curvy} />
          <div className={styles.curvy2} />
          <div className={styles.curvy3} />
          <div className={styles.curvy4} />
          <div className={styles.HomeHeroMeta}>
            <h1
              className={heroTitleClass}
              data-tooltip-id="tooltip"
              data-tooltip-content={hero ? heroTitle : "name"}
            >
              {hero ? heroTitle : <Skeleton />}
            </h1>
            <div className={styles.HomeHeroMetaRow2}>
              <p className={styles.type}>
                {hero ? getMiruroMediaLabel(hero) : <Skeleton width={60} />}
              </p>
              {hero ? (
                <Link className={styles.links} href={detailHref(hero)}>detail</Link>
              ) : (
                <Skeleton width={200} />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.HomeListAll}>
        {renderSection("Trending",         trending,            trendingLoading,  trendingRef,  0)}
        {renderSection("Popular",          popular,             popularLoading,   popularRef,   1)}
        {renderSection("Trending Mix",     trending.slice(6),   trendingLoading,  null,         2)}
        {renderSection("Popular Classics", popular.slice(6),    popularLoading,   null,         3)}
        {renderSection("Upcoming",         upcoming,            upcomingLoading,  upcomingRef,  4)}
        {renderSection("Spotlight Picks",  spotlight,           spotlightLoading, spotlightRef, 5)}
        {renderSection("Upcoming Hype",    upcoming.slice(6),   upcomingLoading,  null,         6)}
        <AnimeSchedule />
      </div>
    </div>
  );
};

export default JapaneseHubHome;
