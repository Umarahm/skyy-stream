import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import ReactPaginate from "react-paginate";
import { AiFillLeftCircle, AiFillRightCircle } from "react-icons/ai";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";
import styles from "./MobileMangaSidebar.module.scss";

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

type MobileMangaSidebarProps = {
  provider: string;
  language: string;
  activeTab: "chapters" | "details";
  mangaInfo: MangaInfo | null;
  selectedChapter?: MangaChapter;
  selectedChapterNumber: string;
  chapterListLength: number;
  paginatedChapters: MangaChapter[];
  chapterPage: number;
  chapterTotalPages: number;
  loadingInfo: boolean;
  error: string;
  selectedChapterId: string;
  expandedChapterId: string;
  onProviderChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onActiveTabChange: (value: "chapters" | "details") => void;
  onChapterPageChange: (value: number) => void;
  onChapterSelect: (chapterId: string) => void;
};

const CHAPTERS_PER_PAGE = 15;

const MobileMangaSidebar = ({
  provider,
  language,
  activeTab,
  mangaInfo,
  selectedChapter,
  selectedChapterNumber,
  chapterListLength,
  paginatedChapters,
  chapterPage,
  chapterTotalPages,
  loadingInfo,
  error,
  selectedChapterId,
  expandedChapterId,
  onProviderChange,
  onLanguageChange,
  onActiveTabChange,
  onChapterPageChange,
  onChapterSelect,
}: MobileMangaSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`${styles.mobileSidebar} ${isOpen ? styles.mobileSidebarOpen : ""}`}
      aria-label="Manga mobile controls"
    >
      <button
        type="button"
        className={styles.mobileHandle}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <div>
          <span>{mangaInfo?.title || "Manga reader"}</span>
          <p>{selectedChapter?.title || "Select a chapter"}</p>
        </div>
        {isOpen ? <MdKeyboardArrowDown /> : <MdKeyboardArrowUp />}
      </button>

      <div className={styles.mobilePanel}>
        <div className={styles.topControls}>
          <select
            value={provider}
            onChange={(event) => onProviderChange(event.target.value)}
            className={styles.select}
          >
            <option value="weebcentral">Weebcentral</option>
          </select>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className={styles.select}
          >
            <option value="en">Language: EN</option>
          </select>
        </div>

        <div className={styles.chapterMeta}>
          <p>{selectedChapter?.title || "Select a chapter"}</p>
          {selectedChapterNumber ? (
            <p>Chapter No: {selectedChapterNumber}</p>
          ) : null}
        </div>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={activeTab === "chapters" ? styles.activeTab : styles.tab}
            onClick={() => onActiveTabChange("chapters")}
          >
            Chapters
          </button>
          <button
            type="button"
            className={activeTab === "details" ? styles.activeTab : styles.tab}
            onClick={() => onActiveTabChange("details")}
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
                  <button
                    type="button"
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
                      onChapterSelect(chapter.id);
                      setIsOpen(false);
                    }}
                  >
                    <span>{chapter.title}</span>
                    {chapter.releaseDate ? (
                      <p>
                        {new Date(chapter.releaseDate).toLocaleDateString()}
                      </p>
                    ) : (
                      <p>Release date unavailable</p>
                    )}
                  </button>
                ))}
            {!loadingInfo && chapterListLength > CHAPTERS_PER_PAGE && (
              <ReactPaginate
                containerClassName={styles.pagination}
                pageClassName={styles.pageItem}
                activeClassName={styles.paginateActive}
                onPageChange={(event) => {
                  onChapterPageChange(event.selected + 1);
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
                <p>{mangaInfo?.description || "No description available."}</p>
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
    </aside>
  );
};

export default MobileMangaSidebar;
