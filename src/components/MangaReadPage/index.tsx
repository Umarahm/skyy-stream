import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { PiFilePdfFill } from "react-icons/pi";
import styles from "./style.module.scss";
import MobileMangaSidebar from "./MobileMangaSidebar";
import axiosFetch from "@/Utils/fetchBackend";

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

const CHAPTERS_PER_PAGE = 15;
const INITIAL_PAGE_BATCH = 3;
const PAGE_BATCH_SIZE = 3;

const MangaImageWithLoader = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={styles.imageFrame}>
      {!loaded && (
        <div className={styles.staticImageLoader} aria-hidden="true" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={!loaded ? styles.pageImageHidden : ""}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const MangaReadPage = () => {
  const params = useSearchParams();
  const [provider, setProvider] = useState("weebcentral");
  const [language, setLanguage] = useState("en");
  const [activeTab, setActiveTab] = useState<"chapters" | "details">(
    "chapters",
  );
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
  const [isPdfModeOpen, setIsPdfModeOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [desktopSpread, setDesktopSpread] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [visiblePageCount, setVisiblePageCount] = useState(INITIAL_PAGE_BATCH);
  const mangaScrollRef = useRef<HTMLDivElement | null>(null);
  const pageLoadSentinelRef = useRef<HTMLDivElement | null>(null);
  const pdfScrollRef = useRef<HTMLDivElement | null>(null);
  const pdfLoadSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const idFromQuery = params.get("id");
    setMangaId(idFromQuery ? decodeURIComponent(idFromQuery) : "");
  }, [params]);

  useEffect(() => {
    if (!mangaId) {
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
        const infoPayload =
          (await axiosFetch({
            requestID: "mangaInfo",
            provider,
            id: mangaId,
          })) || {};
        setMangaInfo(infoPayload);
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
    if (!selectedChapterId) {
      setChapterPages([]);
      setVisiblePageCount(INITIAL_PAGE_BATCH);
      setLoadingPages(false);
      return;
    }

    const fetchChapterPages = async () => {
      setLoadingPages(true);
      setError("");
      try {
        const response = await axiosFetch({
          requestID: "mangaRead",
          provider,
          chapterId: selectedChapterId,
        });
        const readPayload = Array.isArray(response) ? response : [];
        const sortedPages = [...readPayload].sort((a, b) => a.page - b.page);
        setVisiblePageCount(INITIAL_PAGE_BATCH);
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
    return mangaInfo?.chapters?.find(
      (chapter) => chapter.id === selectedChapterId,
    );
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
  const visibleChapterPages = useMemo(
    () =>
      chapterPages.slice(0, Math.min(visiblePageCount, chapterPages.length)),
    [chapterPages, visiblePageCount],
  );

  const loadMoreVisiblePages = useCallback(() => {
    setVisiblePageCount((prev) =>
      Math.min(prev + PAGE_BATCH_SIZE, chapterPages.length),
    );
  }, [chapterPages.length]);

  const hasMorePagesToRender = visiblePageCount < chapterPages.length;

  const fullscreenStep = desktopSpread ? 2 : 1;
  const fullscreenPages = useMemo(() => {
    if (!chapterPages.length) return [];
    return chapterPages.slice(
      fullscreenIndex,
      fullscreenIndex + fullscreenStep,
    );
  }, [chapterPages, fullscreenIndex, fullscreenStep]);

  const handleOpenFullscreen = (index: number) => {
    const mobileViewport =
      typeof window !== "undefined"
        ? window.innerWidth < 769
        : !isDesktopViewport;
    setFullscreenIndex(index);
    setDesktopSpread(false);
    setIsPdfModeOpen(mobileViewport);
    setVisiblePageCount((prev) =>
      Math.max(prev, Math.min(index + PAGE_BATCH_SIZE, chapterPages.length)),
    );
    setIsFullscreenOpen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreenOpen(false);
    setIsPdfModeOpen(false);
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
  const canGoNextFullscreen =
    fullscreenIndex + fullscreenStep < chapterPages.length;

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
        handleCloseFullscreen();
      } else if (
        !isPdfModeOpen &&
        event.key === "ArrowLeft" &&
        canGoPrevFullscreen
      ) {
        handlePrevFullscreen();
      } else if (
        !isPdfModeOpen &&
        event.key === "ArrowRight" &&
        canGoNextFullscreen
      ) {
        handleNextFullscreen();
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, [
    isFullscreenOpen,
    isPdfModeOpen,
    canGoPrevFullscreen,
    canGoNextFullscreen,
    fullscreenStep,
  ]);

  useEffect(() => {
    if (loadingPages || !hasMorePagesToRender || !pageLoadSentinelRef.current)
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreVisiblePages();
        }
      },
      {
        root: isDesktopViewport ? mangaScrollRef.current : null,
        rootMargin: "600px 0px",
      },
    );
    observer.observe(pageLoadSentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [
    hasMorePagesToRender,
    isDesktopViewport,
    loadMoreVisiblePages,
    loadingPages,
    visiblePageCount,
  ]);

  useEffect(() => {
    if (
      !isFullscreenOpen ||
      !isPdfModeOpen ||
      !hasMorePagesToRender ||
      !pdfLoadSentinelRef.current
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreVisiblePages();
        }
      },
      {
        root: pdfScrollRef.current,
        rootMargin: "600px 0px",
      },
    );
    observer.observe(pdfLoadSentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [
    hasMorePagesToRender,
    isFullscreenOpen,
    isPdfModeOpen,
    loadMoreVisiblePages,
    visiblePageCount,
  ]);

  return (
    <>
      <Head>
        <title>
          Rive | Read Manga{" "}
          {mangaInfo?.title
            ? `| ${mangaInfo.title}`
            : mangaId
              ? `| ${mangaId}`
              : ""}
        </title>
      </Head>
      <div className={styles.MangaReadPage}>
        <div className={styles.biggerPic}>
          <div className={styles.mangaPages} ref={mangaScrollRef}>
            {loadingPages ? (
              [1, 2, 3].map((item) => (
                <Skeleton key={item} className={styles.pageSkeleton} />
              ))
            ) : !selectedChapterId ? (
              <div className={styles.selectChapterState}>
                <div className={styles.logoLoader} />
                <h2>Select a chapter to start reading</h2>
                <p>Thank you for reading manga with rive UwU</p>
              </div>
            ) : chapterPages.length > 0 ? (
              visibleChapterPages.map((pageImage, index) => (
                <div
                  className={styles.pageCard}
                  key={`${pageImage.page}-${pageImage.img}`}
                  onClick={() => handleOpenFullscreen(index)}
                >
                  <button
                    className={styles.fullscreenBtn}
                    aria-label="Open fullscreen"
                  >
                    <MdFullscreen />
                  </button>
                  <span className={styles.pageNumberLabel}>
                    Page {pageImage.page}
                  </span>
                  <MangaImageWithLoader
                    src={pageImage.img}
                    alt={`Page ${pageImage.page}`}
                  />
                </div>
              ))
            ) : (
              <div className={styles.selectChapterState}>
                <div className={styles.logoLoader} />
                <h2>No pages found</h2>
                <p>Try another chapter from the chapter list.</p>
              </div>
            )}
            {!loadingPages && hasMorePagesToRender && (
              <div className={styles.pageLoadMore} ref={pageLoadSentinelRef}>
                <div className={styles.logoLoader} />
                <span>Loading more pages</span>
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

            <h2 className={styles.mangaTitle}>
              {mangaInfo?.title || <Skeleton width={160} />}
            </h2>
            <div className={styles.chapterMeta}>
              <p>{selectedChapter?.title || "Select a chapter"}</p>
              {selectedChapterNumber ? (
                <p>Chapter No: {selectedChapterNumber}</p>
              ) : null}
            </div>

            <div className={styles.tabRow}>
              <button
                className={
                  activeTab === "chapters" ? styles.activeTab : styles.tab
                }
                onClick={() => setActiveTab("chapters")}
              >
                Chapters
              </button>
              <button
                className={
                  activeTab === "details" ? styles.activeTab : styles.tab
                }
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
                            ? `${styles.chapterItem} ${styles.chapterItemActive} ${
                                expandedChapterId === chapter.id
                                  ? styles.chapterExpanded
                                  : ""
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
                              <p>
                                {new Date(
                                  chapter.releaseDate,
                                ).toLocaleDateString()}
                              </p>
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
                    previousLabel={
                      <AiFillLeftCircle className={styles.paginationIcons} />
                    }
                    nextLabel={
                      <AiFillRightCircle className={styles.paginationIcons} />
                    }
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
                    <p>
                      {mangaInfo?.description || "No description available."}
                    </p>
                    <h3>Authors</h3>
                    <p>
                      {mangaInfo?.authors?.length
                        ? mangaInfo.authors.join(", ")
                        : "Unknown"}
                    </p>
                    <h3>Genres</h3>
                    <p>
                      {mangaInfo?.genres?.length
                        ? mangaInfo.genres.join(", ")
                        : "Unknown"}
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
      <MobileMangaSidebar
        provider={provider}
        language={language}
        activeTab={activeTab}
        mangaInfo={mangaInfo}
        selectedChapter={selectedChapter}
        selectedChapterNumber={selectedChapterNumber}
        chapterListLength={chapterList.length}
        paginatedChapters={paginatedChapters}
        chapterPage={chapterPage}
        chapterTotalPages={chapterTotalPages}
        loadingInfo={loadingInfo}
        error={error}
        selectedChapterId={selectedChapterId}
        expandedChapterId={expandedChapterId}
        onProviderChange={setProvider}
        onLanguageChange={setLanguage}
        onActiveTabChange={setActiveTab}
        onChapterPageChange={setChapterPage}
        onChapterSelect={(chapterId: string) => {
          setSelectedChapterId(chapterId);
          setExpandedChapterId((prev) => (prev === chapterId ? "" : chapterId));
        }}
      />
      {isFullscreenOpen && (
        <div className={styles.fullscreenOverlay}>
          <div className={styles.pageIndicator}>
            {isPdfModeOpen
              ? "PDF Mode"
              : fullscreenPages[0]?.page
                ? `Page ${fullscreenPages[0].page}${
                    desktopSpread && fullscreenPages[1]?.page
                      ? ` - ${fullscreenPages[1].page}`
                      : ""
                  }`
                : "Manga Reader"}
          </div>
          <div className={styles.fullscreenActions}>
            {isDesktopViewport && (
              <button
                className={`${styles.iconBtn} ${isPdfModeOpen ? styles.iconBtnActive : ""}`}
                onClick={() => setIsPdfModeOpen((prev) => !prev)}
                aria-label="Toggle PDF scroll mode"
                title="PDF scroll mode"
              >
                <PiFilePdfFill />
              </button>
            )}
            {isDesktopViewport && (
              <>
                {/* <span className={styles.desktopModeLabel}>Enable desktop mode</span> */}
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
              onClick={handleCloseFullscreen}
              aria-label="Close fullscreen"
            >
              <MdClose />
            </button>
          </div>
          {isPdfModeOpen ? (
            <div
              className={`${styles.pdfBody} ${
                desktopSpread && isDesktopViewport ? styles.pdfBodySpread : ""
              }`}
              ref={pdfScrollRef}
            >
              {visibleChapterPages.map((pageImage) => (
                <div
                  className={styles.pdfPage}
                  key={`pdf-${pageImage.page}-${pageImage.img}`}
                >
                  <span className={styles.pageNumberLabel}>
                    Page {pageImage.page}
                  </span>
                  <MangaImageWithLoader
                    src={pageImage.img}
                    alt={`Page ${pageImage.page}`}
                  />
                </div>
              ))}
              {hasMorePagesToRender && (
                <div className={styles.pageLoadMore} ref={pdfLoadSentinelRef}>
                  <div className={styles.logoLoader} />
                  <span>Loading more pages</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className={`${styles.fullscreenBody} ${
                  desktopSpread ? styles.fullscreenBodySpread : ""
                }`}
              >
                {fullscreenPages.map((pageImage) => (
                  <div
                    className={styles.fullscreenPage}
                    key={`fullscreen-${pageImage.page}`}
                  >
                    <span className={styles.pageNumberLabel}>
                      Page {pageImage.page}
                    </span>
                    <MangaImageWithLoader
                      src={pageImage.img}
                      alt={`Page ${pageImage.page}`}
                    />
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
            </>
          )}
        </div>
      )}
    </>
  );
};

export default MangaReadPage;
