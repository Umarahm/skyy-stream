import { useEffect, useMemo, useRef, useState } from "react";
import ReactPaginate from "react-paginate";
import { AiFillLeftCircle, AiFillRightCircle } from "react-icons/ai";
import Skeleton from "react-loading-skeleton";
import MovieCardSmall from "@/components/MovieCardSmall";
import {
  getMiruroDisplayTitle,
  getMiruroFiltered,
  getMiruroMediaLabel,
  getMiruroPoster,
  getMiruroSearch,
  getMiruroSuggestions,
} from "@/Utils/miruro";
import styles from "./style.module.scss";

const dummyList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_ANIME_SEARCH_PAGES = 20;
const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

type FilterState = {
  year: string;
  genre: string;
  tag: string;
  season: string;
  format: string;
  status: string;
  sort: string;
};

const defaultFilters: FilterState = {
  year: "all",
  genre: "all",
  tag: "all",
  season: "all",
  format: "all",
  status: "all",
  sort: "popularity",
};

const AnimeSearchPage = () => {
  const searchBar = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topFormat, setTopFormat] = useState<"TV" | "MOVIE">("TV");
  const [topGenre, setTopGenre] = useState("Action");
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const searchMode = query.trim().length >= 2;

  useEffect(() => {
    searchBar.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        event.preventDefault();
        searchBar.current?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        searchBar.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 1) {
        setSuggestions([]);
        return;
      }
      const list = await getMiruroSuggestions(q);
      setSuggestions(Array.isArray(list) ? list.slice(0, 8) : []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = searchMode
          ? await getMiruroSearch(query.trim(), currentPage)
          : await getMiruroFiltered(topGenre, topFormat, currentPage);

        const list = Array.isArray(response?.results) ? response.results : [];
        setResults(list);
        const apiPage = Number(response?.page || currentPage || 1);
        const total = Number(response?.total || 0);
        const perPage = Number(response?.perPage || 20);
        const computedTotal = Math.max(1, Math.ceil(total / (perPage || 20)));
        const hasNextPage = Boolean(response?.hasNextPage);
        const fallbackTotal = hasNextPage ? apiPage + 1 : apiPage;
        setTotalPages(
          Math.min(
            MAX_ANIME_SEARCH_PAGES,
            computedTotal > 1 ? computedTotal : Math.max(1, fallbackTotal),
          ),
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [query, currentPage, topFormat, topGenre, searchMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, topFormat, topGenre]);

  const mappedCards = useMemo(
    () =>
      results.map((item, idx) => {
        const id = item?.id || `${getMiruroDisplayTitle(item)}-${idx}`;
        return {
          id,
          title: getMiruroDisplayTitle(item),
          poster_path: getMiruroPoster(item),
          mediaLabel: getMiruroMediaLabel(item),
          seasonYear: item?.seasonYear,
          genres: item?.genres || [],
          season: item?.season,
          status: item?.status,
          format: item?.format,
          score: item?.averageScore,
          popularity: item?.popularity,
          source: item?.source,
          href: `/anime-details?id=${id}`,
        };
      }),
    [results],
  );

  const filterOptions = useMemo(() => {
    const years = Array.from(
      new Set(mappedCards.map((item) => String(item?.seasonYear || "")).filter(Boolean)),
    )
      .sort((a, b) => Number(b) - Number(a))
      .slice(0, 25);
    const tags = Array.from(
      new Set(mappedCards.map((item) => String(item?.source || "")).filter(Boolean)),
    );
    const seasons = Array.from(
      new Set(mappedCards.map((item) => String(item?.season || "")).filter(Boolean)),
    );
    const formats = Array.from(
      new Set(mappedCards.map((item) => String(item?.format || "")).filter(Boolean)),
    );
    const statuses = Array.from(
      new Set(mappedCards.map((item) => String(item?.status || "")).filter(Boolean)),
    );
    return { years, tags, seasons, formats, statuses };
  }, [mappedCards]);

  const visibleCards = useMemo(() => {
    const filtered = mappedCards.filter((item) => {
      if (filters.year !== "all" && String(item?.seasonYear || "") !== filters.year) return false;
      if (
        filters.genre !== "all" &&
        !item?.genres?.some((genre: string) => genre.toLowerCase() === filters.genre.toLowerCase())
      ) {
        return false;
      }
      if (filters.tag !== "all" && String(item?.source || "") !== filters.tag) return false;
      if (filters.season !== "all" && String(item?.season || "") !== filters.season) return false;
      if (filters.format !== "all" && String(item?.format || "") !== filters.format) return false;
      if (filters.status !== "all" && String(item?.status || "") !== filters.status) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (filters.sort) {
      case "score":
        sorted.sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0));
        break;
      case "latest":
        sorted.sort((a, b) => Number(b?.seasonYear || 0) - Number(a?.seasonYear || 0));
        break;
      case "title":
        sorted.sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));
        break;
      default:
        sorted.sort((a, b) => Number(b?.popularity || 0) - Number(a?.popularity || 0));
        break;
    }
    return sorted;
  }, [mappedCards, filters]);

  const renderSuggestionLabel = (item: any) =>
    typeof item === "string"
      ? item
      : getMiruroDisplayTitle(item) || item?.name || item?.title || String(item?.id || "");

  return (
    <div className={styles.MoviePage}>
      <div className={styles.InputWrapper}>
        <input
          ref={searchBar}
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          placeholder="Search anime..."
          onFocus={() => {
            setIsSearchBarFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setIsSearchBarFocused(false);
            setTimeout(() => setShowSuggestions(false), 100);
          }}
        />
        <div className={styles.inputShortcut}>
          {!isSearchBarFocused ? (
            <span className="tooltip-btn">/</span>
          ) : (
            <span className="tooltip-btn">Esc</span>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && query.trim().length > 0 ? (
          <div className={styles.suggestionsBox}>
            {suggestions.map((item, idx) => {
              const label = renderSuggestionLabel(item);
              return (
                <button
                  key={`${label}-${idx}`}
                  type="button"
                  className={styles.suggestionItem}
                  onMouseDown={() => {
                    setQuery(label);
                    setShowSuggestions(false);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {searchMode ? (
        <h1>
          showing results for <span className={styles.serachQuery}>{query}</span>
        </h1>
      ) : (
        <h1 className={styles.topLine}>
          Top
          <select
            value={topFormat}
            onChange={(e) => setTopFormat(e.target.value as "TV" | "MOVIE")}
          >
            <option value="TV">TV</option>
            <option value="MOVIE">Movie</option>
          </select>
          in
          <select value={topGenre} onChange={(e) => setTopGenre(e.target.value)}>
            {GENRES.map((genre) => (
              <option value={genre} key={genre}>
                {genre}
              </option>
            ))}
          </select>
        </h1>
      )}

      <div className={styles.filterRow}>
        <select value={filters.year} onChange={(e) => updateFilter("year", e.target.value)}>
          <option value="all">Year</option>
          {filterOptions.years.map((year) => (
            <option value={year} key={year}>
              {year}
            </option>
          ))}
        </select>
        <select value={filters.genre} onChange={(e) => updateFilter("genre", e.target.value)}>
          <option value="all">Genre</option>
          {GENRES.map((genre) => (
            <option value={genre} key={genre}>
              {genre}
            </option>
          ))}
        </select>
        <select value={filters.tag} onChange={(e) => updateFilter("tag", e.target.value)}>
          <option value="all">Tag</option>
          {filterOptions.tags.map((tag) => (
            <option value={tag} key={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select value={filters.season} onChange={(e) => updateFilter("season", e.target.value)}>
          <option value="all">Season</option>
          {filterOptions.seasons.map((season) => (
            <option value={season} key={season}>
              {season}
            </option>
          ))}
        </select>
        <select value={filters.format} onChange={(e) => updateFilter("format", e.target.value)}>
          <option value="all">Format</option>
          {filterOptions.formats.map((format) => (
            <option value={format} key={format}>
              {format}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="all">Status</option>
          {filterOptions.statuses.map((status) => (
            <option value={status} key={status}>
              {status}
            </option>
          ))}
        </select>
        <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
          <option value="popularity">Sort</option>
          <option value="score">Score</option>
          <option value="latest">Latest</option>
          <option value="title">Title</option>
        </select>
      </div>

      <div className={styles.movieList}>
        {loading
          ? dummyList.map((value) => <Skeleton className={styles.loading} key={value} />)
          : visibleCards.map((item) => (
              <MovieCardSmall
                key={item.id}
                data={item}
                media_type="tv"
                customHref={item.href}
                openInNewTab={false}
              />
            ))}
      </div>

      {!loading && query.trim().length > 1 && visibleCards.length === 0 ? <h2>No Data Found</h2> : null}

      {totalPages > 1 ? (
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
      ) : null}
    </div>
  );
};

export default AnimeSearchPage;
