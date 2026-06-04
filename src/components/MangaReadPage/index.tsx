import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Head from "next/head";
import Skeleton from "react-loading-skeleton";
import ReactPaginate from "react-paginate";
import { AiFillLeftCircle, AiFillRightCircle } from "react-icons/ai";
import {
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdFullscreen,
} from "react-icons/md";
import { LuLaptopMinimal } from "react-icons/lu";
import styles from "./style.module.scss";

type MangaChapter = {
  id: string;
  title: string;
  releaseDate?: string;
};

type MangaInfo = {
  id: string;
  title: string;
  image?: string;
  description?: string;
  authors?: string[];
  genres?: string[];
  releaseDate?: string;
  status?: string;
  chapters?: MangaChapter[];
};

type MangaPageImage = {
  img: string;
  page: number;
  headerForImage?: string;
};

const baseApi = process.env.NEXT_PUBLIC_CONSUMET_API;
const CHAPTERS_PER_PAGE = 15;

const buildApiUrl = (path: string) => {
  return `${baseApi?.replace(/\/+$/, "")}${path}`;
};

const MangaReadPage = () => {
  const params = useSearchParams();
  const [provider, setProvider] = useState("weebcentral");
  const [language, setLanguage] = useState("en");
  const [activeTab, setActiveTab] = useState<"chapters" | "details">("chapters");
  const [mangaId, setMangaId] = useState("");
  const [mangaInfo, setMangaInfo] = useState<MangaInfo | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [expandedChapterId, setExpandedChapterId] = useState("");
  const [chapterPage, setChapterPage] = useState(1);
  const [chapterPages, setChapterPages] = useState<MangaPageImage[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingPages, setLoadingPages] = useState(true);
  const [error, setError] = useState("");
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [desktopSpread, setDesktopSpread] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    const idFromQuery = params.get("id");
    setMangaId(idFromQuery ? decodeURIComponent(idFromQuery) : "");
  }, [params]);

  useEffect(() => {
    if (!baseApi || !mangaId) {
      setLoadingInfo(false);
      setMangaInfo(null);
      return;
    }

    const fetchMangaInfo = async () => {
      setLoadingInfo(true);
      setError("");
      setSelectedChapterId("");
      setExpandedChapterId("");
      setChapterPage(1);
      try {
        const response = await axios.get(
          buildApiUrl(`/manga/${provider}/info?id=${encodeURIComponent(mangaId)}`),
        );
        const infoPayload = response?.data || {};
        setMangaInfo(infoPayload);
        const firstChapterId = infoPayload?.chapters?.[0]?.id || "";
        setSelectedChapterId(firstChapterId);
        setExpandedChapterId(firstChapterId);
      } catch (err) {
        console.error("Error fetching manga info:", err);
        setError("Unable to load manga details.");
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchMangaInfo();
  }, [mangaId, provider, language]);

  useEffect(() => {
    if (!baseApi || !selectedChapterId) {
      setChapterPages([]);
      setLoadingPages(false);
      return;
    }

    const fetchChapterPages = async () => {
      setLoadingPages(true);
      setError("");
      try {
        const response = await axios.get(
          buildApiUrl(
            `/manga/${provider}/read?chapterId=${encodeURIComponent(selectedChapterId)}`,
          ),
        );
        const readPayload = Array.isArray(response?.data) ? response.data : [];
        const sortedPages = [...readPayload].sort((a, b) => a.page - b.page);
        setChapterPages(sortedPages);
      } catch (err) {
        console.error("Error fetching chapter pages:", err);
        setError("Unable to load chapter pages.");
        setChapterPages([]);
      } finally {
        setLoadingPages(false);
      }
    };

    fetchChapterPages();
  }, [selectedChapterId, provider]);

  const selectedChapter = useMemo(() => {
    return mangaInfo?.chapters?.find((chapter) => chapter.id === selectedChapterId);
  }, [mangaInfo, selectedChapterId]);

  const selectedChapterNumber = useMemo(() => {
    if (!selectedChapter?.title) return "";
    const chapterMatch = selectedChapter.title.match(/(\d+(\.\d+)?)/);
    return chapterMatch?.[0] || "";
  }, [selectedChapter]);

  const chapterList = useMemo(() => mangaInfo?.chapters || [], [mangaInfo]);
  const chapterTotalPages = useMemo(
    () => Math.max(1, Math.ceil(chapterList.length / CHAPTERS_PER_PAGE)),
    [chapterList],
  );
  const paginatedChapters = useMemo(() => {
    const start = (chapterPage - 1) * CHAPTERS_PER_PAGE;
    return chapterList.slice(start, start + CHAPTERS_PER_PAGE);
  }, [chapterList, chapterPage]);

  const fullscreenStep = desktopSpread ? 2 : 1;
  const fullscreenPages = useMemo(() => {
    if (!chapterPages.length) return [];
    return chapterPages.slice(fullscreenIndex, fullscreenIndex + fullscreenStep);
  }, [chapterPages, fullscreenIndex, fullscreenStep]);

  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setDesktopSpread(false);
    setIsFullscreenOpen(true);
  };

  const handlePrevFullscreen = () => {
    setFullscreenIndex((prev) => Math.max(0, prev - fullscreenStep));
  };

  const handleNextFullscreen = () => {
    setFullscreenIndex((prev) =>
      Math.min(chapterPages.length - 1, prev + fullscreenStep),
    );
  };

  const canGoPrevFullscreen = fullscreenIndex > 0;
  const canGoNextFullscreen = fullscreenIndex + fullscreenStep < chapterPages.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewportMode = () => {
      const desktopMode = window.innerWidth >= 769;
      setIsDesktopViewport(desktopMode);
      if (!desktopMode) {
        setDesktopSpread(false);
      }
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreenOpen) return;
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      } else if (event.key === "ArrowLeft" && canGoPrevFullscreen) {
        handlePrevFullscreen();
      } else if (event.key === "ArrowRight" && canGoNextFullscreen) {
        handleNextFullscreen();
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, [isFullscreenOpen, canGoPrevFullscreen, canGoNextFullscreen, fullscreenStep]);

  return (
    <>
      <Head>
        <title>
          Rive | Read Manga{" "}
          {mangaInfo?.title ? `| ${mangaInfo.title}` : mangaId ? `| ${mangaId}` : ""}
        </title>
      </Head>
      <div className={styles.MangaReadPage}>
        <div className={styles.biggerPic}>
          <div className={styles.mangaPages}>
            {loadingPages
              ? [1, 2, 3].map((item) => (
                <Skeleton key={item} className={styles.pageSkeleton} />
              ))
              : chapterPages.length > 0
                ? chapterPages.map((pageImage, index) => (
                  <div
                    className={styles.pageCard}
                    key={`${pageImage.page}-${pageImage.img}`}
                    onClick={() => handleOpenFullscreen(index)}
                  >
                    <button className={styles.fullscreenBtn} aria-label="Open fullscreen">
                      <MdFullscreen />
                    </button>
                    <img
                      src={pageImage.img}
                      alt={`Page ${pageImage.page}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))
                : mangaInfo?.image && (
                  <div className={styles.pageCard}>
                    <img
                      src={mangaInfo.image}
                      alt={mangaInfo.title || "Manga cover"}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
          </div>
        </div>
        <div className={styles.biggerDetail}>
          <div className={styles.sidebar}>
            <div className={styles.topControls}>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={styles.select}
              >
                <option value="weebcentral">Weebcentral</option>
              </select>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={styles.select}
              >
                <option value="en">Language: EN</option>
              </select>
            </div>

            <h2 className={styles.mangaTitle}>{mangaInfo?.title || <Skeleton width={160} />}</h2>
            <div className={styles.chapterMeta}>
              <p>{selectedChapter?.title || "Select a chapter"}</p>
              {selectedChapterNumber ? <p>Chapter No: {selectedChapterNumber}</p> : null}
            </div>

            <div className={styles.tabRow}>
              <button
                className={activeTab === "chapters" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("chapters")}
              >
                Chapters
              </button>
              <button
                className={activeTab === "details" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {activeTab === "chapters" && (
              <div className={`${styles.tabContent} ${styles.episodeList}`}>
                {loadingInfo
                  ? [1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className={styles.chapterSkeleton} />
                  ))
                  : paginatedChapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className={
                        chapter.id === selectedChapterId
                          ? `${styles.chapterItem} ${styles.chapterItemActive} ${expandedChapterId === chapter.id ? styles.chapterExpanded : ""
                          }`
                          : styles.chapterItem
                      }
                      onClick={() => {
                        setSelectedChapterId(chapter.id);
                        setExpandedChapterId((prev) =>
                          prev === chapter.id ? "" : chapter.id,
                        );
                      }}
                    >
                      <div className={styles.episodeHeader}>
                        <div className={styles.details}>
                          <h4>{chapter.title}</h4>
                          {chapter.releaseDate ? (
                            <p>{new Date(chapter.releaseDate).toLocaleDateString()}</p>
                          ) : (
                            <p>Release date unavailable</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {!loadingInfo && chapterList.length > CHAPTERS_PER_PAGE && (
                  <ReactPaginate
                    containerClassName={styles.pagination}
                    pageClassName={styles.pageItem}
                    activeClassName={styles.paginateActive}
                    onPageChange={(event) => {
                      setChapterPage(event.selected + 1);
                    }}
                    forcePage={chapterPage - 1}
                    pageCount={chapterTotalPages}
                    breakLabel=" ... "
                    previousLabel={<AiFillLeftCircle className={styles.paginationIcons} />}
                    nextLabel={<AiFillRightCircle className={styles.paginationIcons} />}
                  />
                )}
              </div>
            )}

            {activeTab === "details" && (
              <div className={styles.tabContent}>
                {loadingInfo ? (
                  <Skeleton count={8} />
                ) : (
                  <div className={styles.detailsInfo}>

                    <h3>Title</h3>
                    <p>{mangaInfo?.title || "Unknown"}</p>
                    <h3>Description</h3>
                    <p>{mangaInfo?.description || "No description available."}</p>
                    <h3>Authors</h3>
                    <p>
                      {mangaInfo?.authors?.length
                        ? mangaInfo.authors.join(", ")
                        : "Unknown"}
                    </p>
                    <h3>Genres</h3>
                    <p>
                      {mangaInfo?.genres?.length ? mangaInfo.genres.join(", ") : "Unknown"}
                    </p>
                    <h3>Release Date</h3>
                    <p>{mangaInfo?.releaseDate || "Unknown"}</p>
                    <h3>Status</h3>
                    <p>{mangaInfo?.status || "Unknown"}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isFullscreenOpen && (
        <div className={styles.fullscreenOverlay}>
          <div className={styles.pageIndicator}>
            {fullscreenPages[0]?.page
              ? `Page ${fullscreenPages[0].page}${
                  desktopSpread && fullscreenPages[1]?.page
                    ? ` - ${fullscreenPages[1].page}`
                    : ""
                }`
              : "Manga Reader"}
          </div>
          <div className={styles.fullscreenActions}>
            {isDesktopViewport && (
              <>
                <span className={styles.desktopModeLabel}>Enable desktop mode</span>
                <button
                  className={`${styles.iconBtn} ${desktopSpread ? styles.iconBtnActive : ""}`}
                  onClick={() => setDesktopSpread((prev) => !prev)}
                  aria-label="Toggle desktop two-page mode"
                  title="Desktop two-page mode"
                >
                  <LuLaptopMinimal />
                </button>
              </>
            )}
            <button
              className={styles.iconBtn}
              onClick={() => setIsFullscreenOpen(false)}
              aria-label="Close fullscreen"
            >
              <MdClose />
            </button>
          </div>
          <div
            className={`${styles.fullscreenBody} ${desktopSpread ? styles.fullscreenBodySpread : ""
              }`}
          >
            {fullscreenPages.map((pageImage) => (
              <div className={styles.fullscreenPage} key={`fullscreen-${pageImage.page}`}>
                <img src={pageImage.img} alt={`Page ${pageImage.page}`} />
              </div>
            ))}
          </div>
          <div className={styles.navRail}>
            <button
              className={`${styles.navBtn} ${!canGoPrevFullscreen ? styles.navDisabled : ""}`}
              onClick={handlePrevFullscreen}
              disabled={!canGoPrevFullscreen}
              aria-label="Previous page"
            >
              <MdChevronLeft />
            </button>
            <span className={styles.navLabel}>swipe</span>
            <button
              className={`${styles.navBtn} ${!canGoNextFullscreen ? styles.navDisabled : ""}`}
              onClick={handleNextFullscreen}
              disabled={!canGoNextFullscreen}
              aria-label="Next page"
            >
              <MdChevronRight />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MangaReadPage;
