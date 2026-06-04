import { useEffect, useRef, useState } from "react";
import axios from "axios";
import styles from "./style.module.scss";
import ReactPaginate from "react-paginate";
import { AiFillLeftCircle, AiFillRightCircle } from "react-icons/ai";
import MovieCardSmall from "@/components/MovieCardSmall";
import Skeleton from "react-loading-skeleton";

const dummyList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const baseApi = process.env.NEXT_PUBLIC_CONSUMET_API;

const buildApiUrl = (path: string) => {
  return `${baseApi?.replace(/\/+$/, "")}${path}`;
};

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
    href: item?.id
      ? `/manga-read?id=${encodeURIComponent(item.id)}`
      : "#",
  };
};

const MangaSearchPage = () => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
  const searchBar: any = useRef(null);

  const parseSearchResponse = (response: any) => {
    const responseData = response?.data || response;
    const list = responseData?.results || responseData || [];
    const mappedData = Array.isArray(list)
      ? list.map((item: any, index: number) => mapMangaCardData(item, index))
      : [];

    const pages =
      responseData?.totalPages ||
      responseData?.total_pages ||
      (responseData?.hasNextPage ? currentPage + 1 : currentPage) ||
      1;

    setData(mappedData);
    setTotalPages(Math.max(1, Number(pages)));
  };

  const fetchTopManga = async () => {
    setLoading(true);
    setData([]);
    setTotalPages(1);
    setLoading(false);
  };

  const fetchSearchedManga = async () => {
    setLoading(true);
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await axios.get(
        buildApiUrl(`/manga/weebcentral/${encodedQuery}`),
      );
      parseSearchResponse(response);
    } catch (error) {
      console.error("Error searching manga:", error);
      setData([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchBar?.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();
        searchBar?.current?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        searchBar?.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!baseApi) return;
    if (query.trim().length === 0) {
      fetchTopManga();
      return;
    }

    if (query.trim().length < 2) {
      setData([]);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSearchedManga();
    }, 600);

    return () => clearTimeout(debounceTimer);
  }, [query, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  return (
    <div className={styles.MangaSearchPage}>
      <div className={styles.InputWrapper}>
        <input
          ref={searchBar}
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Please enter at least 2 characters to search manga..."
          onFocus={() => setIsSearchBarFocused(true)}
          onBlur={() => setIsSearchBarFocused(false)}
        />
        <div className={styles.inputShortcut}>
          {!isSearchBarFocused ? (
            <span className="tooltip-btn">/</span>
          ) : (
            <span className="tooltip-btn">Esc</span>
          )}
        </div>
      </div>

      {query.length > 1 ? (
        <h1>
          showing results for <span className={styles.searchQuery}>{query}</span>
        </h1>
      ) : (
        <h1>
          Search Manga on <span className={styles.searchQuery}>Skyyplay</span>
        </h1>
      )}

      <div className={styles.mangaList}>
        {loading
          ? dummyList.map((ele, i) => (
            <Skeleton className={styles.loading} key={`${ele}-${i}`} />
          ))
          : data.map((manga) => (
            <MovieCardSmall
              key={manga?.id}
              data={manga}
              media_type="manga"
              customHref={manga?.href}
              openInNewTab={false}
            />
          ))}
      </div>

      {!loading && query.length > 1 && data.length === 0 ? <h2>No Data Found</h2> : null}

      {totalPages > 1 && (
        <ReactPaginate
          containerClassName={styles.pagination}
          pageClassName={styles.page_item}
          activeClassName={styles.paginateActive}
          onPageChange={(event) => {
            setCurrentPage(event.selected + 1);
            window.scrollTo(0, 0);
          }}
          forcePage={currentPage - 1}
          pageCount={totalPages}
          breakLabel=" ... "
          previousLabel={<AiFillLeftCircle className={styles.paginationIcons} />}
          nextLabel={<AiFillRightCircle className={styles.paginationIcons} />}
        />
      )}
    </div>
  );
};

export default MangaSearchPage;
