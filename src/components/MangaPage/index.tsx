import { useEffect, useState } from "react";
import styles from "./style.module.scss";
import MovieCardSmall from "@/components/MovieCardSmall";
import Link from "next/link";
import Skeleton from "react-loading-skeleton";
import { MdChevronLeft, MdChevronRight, MdSearch } from "react-icons/md";
import { RiDiceFill } from "react-icons/ri";
import axiosFetch from "@/Utils/fetchBackend";

const dummyList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_MANGA_PAGES = 5;

const mapMangaCardData = (item: any, index: number) => {
  const posterPath =
    item?.image ||
    item?.imageUrl ||
    item?.cover ||
    item?.coverImage ||
    item?.thumbnail ||
    item?.poster ||
    item?.posterUrl ||
    item?.img ||
    null;

  return {
    id: item?.id || item?.mangaId || item?.slug || `${item?.title}-${index}`,
    title: item?.title || item?.name || "Unknown Manga",
    poster_path: posterPath,
    href:
      item?.url ||
      item?.link ||
      item?.sourceUrl ||
      (item?.id ? `https://mangadex.org/title/${item?.id}` : "#"),
  };
};

const getMangaResults = (response: any) => {
  const payload = response?.data || response;
  const list =
    payload?.results || payload?.result || payload?.data || payload || [];
  if (Array.isArray(list)) {
    return list.map((item: any, index: number) =>
      mapMangaCardData(item, index),
    );
  }
  if (list && typeof list === "object") {
    return [mapMangaCardData(list, 0)];
  }
  return [];
};

const MangaPage = () => {
  const [recentlyAired, setRecentlyAired] = useState<any[]>([]);
  const [latestUpdates, setLatestUpdates] = useState<any[]>([]);
  const [popularMangas, setPopularMangas] = useState<any[]>([]);
  const [randomManga, setRandomManga] = useState<any[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [latestPage, setLatestPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingRandom, setLoadingRandom] = useState(false);

  const mergeUniqueById = (prev: any[], next: any[]) => {
    const merged = [...prev, ...next];
    const usedIds = new Set();
    return merged.filter((item) => {
      if (usedIds.has(item?.id)) return false;
      usedIds.add(item?.id);
      return true;
    });
  };

  const fetchSection = async ({
    endpoint,
    page,
    setList,
    setLoading,
  }: {
    endpoint: string;
    page: number;
    setList: any;
    setLoading: any;
  }) => {
    if (page > MAX_MANGA_PAGES) return;
    setLoading(true);
    try {
      const response = await axiosFetch({
        requestID: "mangaList",
        mangaCategory: endpoint,
        page,
      });
      const mappedData = getMangaResults(response);
      if (page === 1) {
        setList(mappedData);
      } else {
        setList((prev: any[]) => mergeUniqueById(prev, mappedData));
      }
    } catch (error) {
      console.error(`Error fetching manga list for ${endpoint}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomManga = async () => {
    setLoadingRandom(true);
    setRandomManga([]);
    try {
      const response = await axiosFetch({ requestID: "mangaRandom" });
      const mappedData = getMangaResults(response);
      if (mappedData.length > 0) {
        setRandomManga([mappedData[0]]);
      } else {
        setRandomManga([]);
      }
    } catch (error) {
      console.error("Error fetching random manga:", error);
    } finally {
      setLoadingRandom(false);
    }
  };

  useEffect(() => {
    fetchSection({
      endpoint: "recent",
      page: 1,
      setList: setRecentlyAired,
      setLoading: setLoadingRecent,
    });
    fetchSection({
      endpoint: "latest",
      page: 1,
      setList: setLatestUpdates,
      setLoading: setLoadingLatest,
    });
    fetchSection({
      endpoint: "popular",
      page: 1,
      setList: setPopularMangas,
      setLoading: setLoadingPopular,
    });
    fetchRandomManga();
  }, []);

  const handleSectionScroll = (
    sectionKey: "recent" | "latest" | "popular",
    e: any,
  ) => {
    const node = e?.currentTarget;
    const reachedEnd =
      node.scrollLeft + node.clientWidth >= node.scrollWidth - 120;
    if (!reachedEnd) return;

    if (
      sectionKey === "recent" &&
      !loadingRecent &&
      recentPage < MAX_MANGA_PAGES
    ) {
      const nextPage = recentPage + 1;
      setRecentPage(nextPage);
      fetchSection({
        endpoint: "recent",
        page: nextPage,
        setList: setRecentlyAired,
        setLoading: setLoadingRecent,
      });
    }
    if (
      sectionKey === "latest" &&
      !loadingLatest &&
      latestPage < MAX_MANGA_PAGES
    ) {
      const nextPage = latestPage + 1;
      setLatestPage(nextPage);
      fetchSection({
        endpoint: "latest",
        page: nextPage,
        setList: setLatestUpdates,
        setLoading: setLoadingLatest,
      });
    }
    if (
      sectionKey === "popular" &&
      !loadingPopular &&
      popularPage < MAX_MANGA_PAGES
    ) {
      const nextPage = popularPage + 1;
      setPopularPage(nextPage);
      fetchSection({
        endpoint: "popular",
        page: nextPage,
        setList: setPopularMangas,
        setLoading: setLoadingPopular,
      });
    }
  };

  const sections = [
    {
      key: "recent",
      title: "Recently Aired",
      list: recentlyAired,
      loading: loadingRecent,
      page: recentPage,
    },
    {
      key: "latest",
      title: "Latest Updates",
      list: latestUpdates,
      loading: loadingLatest,
      page: latestPage,
    },
    {
      key: "popular",
      title: "Popular Mangas",
      list: popularMangas,
      loading: loadingPopular,
      page: popularPage,
    },
  ];

  return (
    <div className={styles.MangaPage}>
      <h1>
        Manga
        <Link
          href="/manga-search"
          className={styles.searchManga}
          data-tooltip-id="tooltip"
          data-tooltip-content="Search Manga"
        >
          Search <MdSearch />
        </Link>
      </h1>
      <div className={styles.MangaListAll}>
        {sections.map((section, index) => (
          <div key={section.key}>
            <h2>
              {section.title}
              <div>
                <MdChevronLeft
                  onClick={() => {
                    document
                      .querySelectorAll(`.${styles.MangaListSection}`)
                      [index].scrollBy(-700, 0);
                  }}
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Swipe Left"
                />
                swipe
                <MdChevronRight
                  onClick={() => {
                    document
                      .querySelectorAll(`.${styles.MangaListSection}`)
                      [index].scrollBy(700, 0);
                  }}
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Swipe Right"
                />
              </div>
            </h2>
            <div
              className={styles.MangaListSection}
              onScroll={(e) =>
                handleSectionScroll(
                  section.key as "recent" | "latest" | "popular",
                  e,
                )
              }
            >
              {section.list.map((manga) => (
                <MovieCardSmall
                  key={manga?.id}
                  data={manga}
                  media_type="manga"
                  customHref={manga?.href}
                  openInNewTab={true}
                />
              ))}
              {section.list.length === 0 &&
                dummyList.map((ele, i) => (
                  <Skeleton className={styles.loading} key={`${ele}-${i}`} />
                ))}
              {section.list.length > 0 &&
                section.loading &&
                section.page <= MAX_MANGA_PAGES &&
                [1, 2].map((ele) => (
                  <Skeleton
                    className={styles.loading}
                    key={`${section.key}-more-${ele}`}
                  />
                ))}
            </div>
          </div>
        ))}
        <h2>
          Random
          <button
            className={styles.randomBtn}
            onClick={fetchRandomManga}
            data-tooltip-id="tooltip"
            data-tooltip-content="Fetch Random Manga"
            aria-label="Fetch random manga"
          >
            <RiDiceFill />
          </button>
        </h2>
        <div className={styles.MangaListSection}>
          {randomManga.map((manga) => (
            <MovieCardSmall
              key={manga?.id}
              data={manga}
              media_type="manga"
              customHref={manga?.href}
              openInNewTab={true}
            />
          ))}
          {(randomManga.length === 0 || loadingRandom) && (
            <Skeleton className={styles.loading} key="random-loading" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MangaPage;
