interface Fetch {
  requestID: any;
  id?: string | null;
  language?: string;
  page?: number;
  genreKeywords?: string;
  sortBy?: string;
  year?: number;
  country?: string;
  query?: string;
  season?: number;
  episode?: number;
  service?: string;
  slug?: string;
  ep?: string | number;
  format?: string;
  episodeId?: string;
  provider?: string;
  mangaCategory?: string;
  chapterId?: string;
  sport?: string;
  league?: string;
  dates?: string;
}
export default async function axiosFetch({
  requestID,
  id,
  language = "en-US",
  page = 1,
  genreKeywords,
  sortBy,
  year,
  country,
  query,
  season,
  episode,
  service,
  slug,
  ep,
  format,
  episodeId,
  provider,
  mangaCategory,
  chapterId,
  sport,
  league,
  dates,
}: Fetch) {
  const request = requestID;
  const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const baseURL = process.env.NEXT_PUBLIC_TMDB_API;
  const randomURL = process.env.NEXT_PUBLIC_RANDOM_URL;
  const ProviderURL = process.env.NEXT_PUBLIC_PROVIDER_URL;
  const ProviderENV = process.env.NEXT_PUBLIC_PROVIDER_ENV;
  const ExternalProviderURL = process.env.NEXT_PUBLIC_EXTERNAL_PROVIDER_URL;
  const MIRURO_BASE_URL =
    process.env.MIRURO_API?.trim() ||
    process.env.NEXT_PUBLIC_MIRURO_API?.trim() ||
    "https://miruro-api-dun.vercel.app";
  const ANIKOTO_BASE_URL =
    process.env.ANIKOTO_API?.trim() ||
    process.env.NEXT_PUBLIC_ANIKOTO_API?.trim() ||
    "http://localhost:5007";
  const CONSUMET_BASE_URL =
    process.env.CONSUMET_API?.trim() ||
    process.env.NEXT_PUBLIC_CONSUMET_API?.trim() ||
    "";
  const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY?.trim() || "123";
  const cleanBaseUrl = (value: string) => value.replace(/\/+$/, "");
  const miruroBase = cleanBaseUrl(MIRURO_BASE_URL);
  const anikotoBase = cleanBaseUrl(ANIKOTO_BASE_URL);
  const consumetBase = cleanBaseUrl(CONSUMET_BASE_URL);
  const sportsDbBase = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}`;
  const encodePath = (value: string | number | null | undefined) =>
    String(value || "")
      .replace(/^\/+/, "")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
  const fetchJson = async <T,>(url: string, fallback: T): Promise<T> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return fallback;
      return (await response.json()) as T;
    } catch (error) {
      console.error("Error fetching anime data:", error);
      return fallback;
    }
  };
  const fetchFirstJson = async <T,>(
    urls: string[],
    fallback: T,
    isUsable: (value: T) => boolean,
  ): Promise<T> => {
    for (const url of urls) {
      const response = await fetchJson<T | null>(url, null);
      if (response && isUsable(response as T)) return response as T;
    }
    return fallback;
  };
  const requests: any = {
    latestMovie: `${baseURL}/movie/now_playing?language=${language}&page=${page}`, //nowPlayingMovie
    latestTv: `${baseURL}/tv/airing_today?language=${language}&page=${page}`, // airingTodayTv
    popularMovie: `${baseURL}/movie/popular?language=${language}&page=${page}&sort_by=${sortBy}`, // current popular, so similar to latestMovie data
    popularTv: `${baseURL}/tv/popular?language=${language}&page=${page}&sort_by=${sortBy}`,
    topRatedMovie: `${baseURL}/movie/top_rated?language=${language}&page=${page}`,
    topRatedTv: `${baseURL}/tv/top_rated?language=${language}&page=${page}`,
    filterMovie: `${baseURL}/discover/movie?with_genres=${genreKeywords}&language=${language}&sort_by=${sortBy}${year != undefined ? "&year=" + year : ""}${country != undefined ? "&with_origin_country=" + country : ""}&page=${page}`,
    filterTv: `${baseURL}/discover/tv?with_genres=${genreKeywords}&language=${language}&sort_by=${sortBy}${year != undefined ? "&first_air_date_year=" + year : ""}${country != undefined ? "&with_origin_country=" + country : ""}&page=${page}&with_runtime.gte=1`,
    onTheAirTv: `${baseURL}/tv/on_the_air?language=${language}&page=${page}`,
    trending: `${baseURL}/trending/all/day?language=${language}&page=${page}`,
    trendingMovie: `${baseURL}/trending/movie/week?language=${language}&page=${page}`,
    trendingTv: `${baseURL}/trending/tv/week?language=${language}&page=${page}`,
    trendingMovieDay: `${baseURL}/trending/movie/day?language=${language}&page=${page}`,
    trendingTvDay: `${baseURL}/trending/tv/day?language=${language}&page=${page}`,
    searchMulti: `${baseURL}/search/multi?query=${query}&language=${language}&page=${page}`,
    searchKeyword: `${baseURL}/search/keyword?query=${query}&language=${language}&page=${page}`,
    searchMovie: `${baseURL}/search/movie?query=${query}&language=${language}&page=${page}`,
    searchTv: `${baseURL}/search/tv?query=${query}&language=${language}&page=${page}`,

    // for a ID
    movieData: `${baseURL}/movie/${id}?language=${language}`,
    tvData: `${baseURL}/tv/${id}?language=${language}`,
    personData: `${baseURL}/person/${id}?language=${language}`,
    movieVideos: `${baseURL}/movie/${id}/videos?language=${language}`,
    tvVideos: `${baseURL}/tv/${id}/videos?language=${language}`,
    movieImages: `${baseURL}/movie/${id}/images`,
    tvImages: `${baseURL}/tv/${id}/images`,
    personImages: `${baseURL}/person/${id}/images`,
    movieCasts: `${baseURL}/movie/${id}/credits?language=${language}`,
    tvCasts: `${baseURL}/tv/${id}/credits?language=${language}`,
    movieReviews: `${baseURL}/movie/${id}/reviews?language=${language}`,
    tvReviews: `${baseURL}/tv/${id}/reviews?language=${language}`,
    movieRelated: `${baseURL}/movie/${id}/recommendations?language=${language}&page=${page}`,
    tvRelated: `${baseURL}/tv/${id}/recommendations?language=${language}&page=${page}`,
    tvEpisodes: `${baseURL}/tv/${id}/season/${season}?language=${language}`,
    tvEpisodeDetail: `${baseURL}/tv/${id}/season/${season}/episode/${episode}?language=${language}`,
    movieSimilar: `${baseURL}/movie/${id}/similar?language=${language}&page=${page}`,
    tvSimilar: `${baseURL}/tv/${id}/similar?language=${language}&page=${page}`,

    // person
    personMovie: `${baseURL}/person/${id}/movie_credits?language=${language}&page=${page}`,
    personTv: `${baseURL}/person/${id}/tv_credits?language=${language}&page=${page}`,

    // filters
    genresMovie: `${baseURL}/genre/movie/list?language=${language}`,
    genresTv: `${baseURL}/genre/tv/list?language=${language}`,
    countries: `${baseURL}/configuration/countries?language=${language}`,
    languages: `${baseURL}/configuration/languages`,

    // random
    random: `${randomURL}`,

    // collections
    collection: `${baseURL}/collection/${id}?language=${language}`,
    searchCollection: `${baseURL}/search/collection?query=${query}&language=${language}&page=${page}`,

    // withKeywords
    withKeywordsTv: `${baseURL}/discover/tv?with_keywords=${genreKeywords}&language=${language}&sort_by=${sortBy}${year != undefined ? "&first_air_date_year=" + year : ""}${country != undefined ? "&with_origin_country=" + country : ""}&page=${page}&air_date.lte=${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}${sortBy === "first_air_date.desc" ? "&with_runtime.gte=1" : null}`,
    withKeywordsMovie: `${baseURL}/discover/movie?with_keywords=${genreKeywords}&language=${language}&sort_by=${sortBy}${year != undefined ? "&first_air_date_year=" + year : ""}${country != undefined ? "&with_origin_country=" + country : ""}&page=${page}&release_date.lte=${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}&with_runtime.gte=1`,

    // provider
    VideoProviderServices:
      ProviderENV === "cloudflare"
        ? `${ProviderURL}/api/providers`
        : `${ProviderURL}/providers`,
    movieVideoProvider:
      ProviderENV === "cloudflare"
        ? `${ProviderURL}/api/provider?provider=${service}&id=${id}`
        : `${ProviderURL}/${service}/movie/${id}`,
    tvVideoProvider:
      ProviderENV === "cloudflare"
        ? `${ProviderURL}/api/provider?provider=${service}&id=${id}&season=${season}&episode=${episode}`
        : `${ProviderURL}/${service}/tv/${id}/${season}/${episode}`,

    // External provider
    movieExternalVideoProvider: `${ExternalProviderURL}/${id}?s=0&e=0`,
    tvExternalVideoProvider: `${ExternalProviderURL}/${id}?s=${season}e=${episode}&e=0`,
  };

  const animeListFallback = { results: [] };
  const animePagedFallback = {
    results: [],
    page: 1,
    perPage: 20,
    total: 0,
    hasNextPage: false,
  };
  const animeRequestHandlers: Record<string, () => Promise<any>> = {
    animeTrending: () =>
      fetchJson(`${miruroBase}/trending${page ? `?page=${page}` : ""}`, animeListFallback),
    animePopular: () =>
      fetchJson(`${miruroBase}/popular${page ? `?page=${page}` : ""}`, animeListFallback),
    animeRecent: () =>
      fetchJson(`${miruroBase}/recent${page ? `?page=${page}` : ""}`, animeListFallback),
    animeUpcoming: () => fetchJson(`${miruroBase}/upcoming`, animeListFallback),
    animeSpotlight: () => fetchJson(`${miruroBase}/spotlight`, animeListFallback),
    animeInfo: () => fetchJson(`${miruroBase}/info/${encodePath(id)}`, null),
    animeRelations: () =>
      fetchJson(`${miruroBase}/anime/${encodePath(id)}/relations`, { relations: [] }),
    animeRecommendations: () =>
      fetchJson(`${miruroBase}/anime/${encodePath(id)}/recommendations`, { recommendations: [] }),
    animeCharacters: () =>
      fetchJson(`${miruroBase}/anime/${encodePath(id)}/characters`, { characters: { edges: [] } }),
    animeEpisodes: () => fetchJson(`${miruroBase}/episodes/${encodePath(id)}`, null),
    animeWatchEpisode: () => fetchJson(`${miruroBase}/${encodePath(episodeId)}`, null),
    animeSearch: () => {
      const params = new URLSearchParams({
        query: String(query || "").trim(),
        page: String(page || 1),
      });
      return fetchJson(`${miruroBase}/search?${params.toString()}`, animePagedFallback);
    },
    animeSuggestions: () => {
      const params = new URLSearchParams({ query: String(query || "").trim() });
      return fetchJson(`${miruroBase}/suggestions?${params.toString()}`, { results: [] });
    },
    animeFilter: () => {
      const params = new URLSearchParams({
        genre: String(genreKeywords || "Action"),
        format: String(format || "TV"),
        page: String(page || 1),
      });
      return fetchJson(`${miruroBase}/filter?${params.toString()}`, animePagedFallback);
    },
    animeSchedule: () =>
      fetchJson(`${miruroBase}/schedule?page=${page || 1}`, animePagedFallback),
    anikotoHome: () =>
      fetchFirstJson(
        [`${anikotoBase}/home`, `${anikotoBase}/api/home`],
        { ok: false, cached: false, data: {} },
        (response: any) => Boolean(response?.data),
      ),
    anikotoAnimeDetails: () => {
      const encodedSlug = encodePath(slug);
      return fetchFirstJson(
        [`${anikotoBase}/anime/${encodedSlug}`, `${anikotoBase}/api/anime/${encodedSlug}`],
        { ok: false, data: null },
        (response: any) => Boolean(response?.data),
      );
    },
    anikotoSearch: () => {
      const params = new URLSearchParams({
        keyword: String(query || "").trim(),
        refresh: "1",
      });
      return fetchFirstJson(
        [`${anikotoBase}/search?${params.toString()}`, `${anikotoBase}/api/search?${params.toString()}`],
        { ok: false, data: [] },
        (response: any) => Boolean(response?.data || response?.results),
      );
    },
    anikotoWatch: () => {
      const encodedSlug = encodePath(slug);
      const params = new URLSearchParams({ ep: String(ep || 1) });
      return fetchFirstJson(
        [`${anikotoBase}/watch/${encodedSlug}?${params.toString()}`, `${anikotoBase}/api/watch/${encodedSlug}?${params.toString()}`],
        { ok: false, data: null },
        (response: any) => Boolean(response?.data),
      );
    },
  };

  if (animeRequestHandlers[request]) {
    return animeRequestHandlers[request]();
  }

  const mangaProvider = String(provider || "weebcentral").replace(/^\/+|\/+$/g, "");
  const mangaRequestHandlers: Record<string, () => Promise<any>> = {
    mangaList: () => {
      if (!consumetBase) return Promise.resolve({ results: [] });
      const category = String(mangaCategory || "recent").replace(/^\/+|\/+$/g, "");
      const params = new URLSearchParams({ page: String(page || 1) });
      return fetchJson(`${consumetBase}/manga/mangadex/${category}?${params.toString()}`, { results: [] });
    },
    mangaRandom: () => {
      if (!consumetBase) return Promise.resolve({ results: [] });
      return fetchJson(`${consumetBase}/manga/mangadex/random`, { results: [] });
    },
    mangaSearch: () => {
      if (!consumetBase) return Promise.resolve({ results: [] });
      return fetchJson(
        `${consumetBase}/manga/${mangaProvider}/${encodeURIComponent(String(query || "").trim())}`,
        { results: [] },
      );
    },
    mangaInfo: () => {
      if (!consumetBase) return Promise.resolve(null);
      const params = new URLSearchParams({ id: String(id || "") });
      return fetchJson(`${consumetBase}/manga/${mangaProvider}/info?${params.toString()}`, null);
    },
    mangaRead: () => {
      if (!consumetBase) return Promise.resolve([]);
      const params = new URLSearchParams({ chapterId: String(chapterId || "") });
      return fetchJson(`${consumetBase}/manga/${mangaProvider}/read?${params.toString()}`, []);
    },
  };

  if (mangaRequestHandlers[request]) {
    return mangaRequestHandlers[request]();
  }

  const sportsRequestHandlers: Record<string, () => Promise<any>> = {
    // ESPN — scoreboard/fixtures. Cricket's `scoreboard` resource 404s on ESPN's
    // site API, so it's routed to the Core API `events` resource instead.
    sportsScoreboard: () => {
      if (!sport || !league) return Promise.resolve({ events: [] });
      if (sport === "cricket") {
        return fetchJson(
          `https://sports.core.api.espn.com/v2/sports/cricket/leagues/${encodePath(league)}/events`,
          { items: [] },
        );
      }
      const datesParam = dates ? `?dates=${encodeURIComponent(dates)}` : "";
      return fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/${encodePath(sport)}/${encodePath(league)}/scoreboard${datesParam}`,
        { events: [] },
      );
    },
    // ESPN standings live under `/apis/v2/`, not `/apis/site/v2/` — the latter
    // returns an empty/stub response for most leagues.
    sportsStandings: () => {
      if (!sport || !league) return Promise.resolve({ children: [] });
      return fetchJson(
        `https://site.api.espn.com/apis/v2/sports/${encodePath(sport)}/${encodePath(league)}/standings`,
        { children: [] },
      );
    },
    // Full match report — boxscore, rosters (formation/coach/positions/subs),
    // and key events (goals/cards) for a finished or in-progress match.
    sportsSummary: () => {
      if (!sport || !league || !id) return Promise.resolve({});
      return fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/${encodePath(sport)}/${encodePath(league)}/summary?event=${encodeURIComponent(id)}`,
        {},
      );
    },
    sportsNews: () => {
      if (!sport || !league) return Promise.resolve({ articles: [] });
      return fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/${encodePath(sport)}/${encodePath(league)}/news`,
        { articles: [] },
      );
    },
    // Full article body (HTML in `headlines[0].story`) — the site API's
    // `news` list only carries a short description, this is ESPN's own CMS
    // lookup-by-id endpoint that backs each article's actual story page.
    sportsArticle: () => {
      if (!id) return Promise.resolve({ headlines: [] });
      return fetchJson(`https://content.core.api.espn.com/v1/sports/news/${encodeURIComponent(id)}`, {
        headlines: [],
      });
    },
    // TheSportsDB — direct id-based lookups work fully on the free key, used
    // here as the standings/fixtures source for leagues ESPN covers poorly
    // (e.g. cricket), and as a fallback elsewhere.
    sportsdbTable: () => {
      if (!league) return Promise.resolve({ table: [] });
      const params = new URLSearchParams({ l: String(league) });
      if (season) params.set("s", String(season));
      return fetchJson(`${sportsDbBase}/lookuptable.php?${params.toString()}`, { table: [] });
    },
    sportsdbEventsSeason: () => {
      if (!league) return Promise.resolve({ events: [] });
      const params = new URLSearchParams({ id: String(league) });
      if (season) params.set("s", String(season));
      return fetchJson(`${sportsDbBase}/eventsseason.php?${params.toString()}`, { events: [] });
    },
    // `sport` here is TheSportsDB's human-readable sport name ("Soccer",
    // "Cricket", "Basketball", ...), not an ESPN/streamed.pk slug — the
    // sport-filtered eventsday call returns full real data; the unfiltered
    // one is capped to a small sample on the free key.
    sportsdbEventsDay: () => {
      if (!dates || !sport) return Promise.resolve({ events: [] });
      const params = new URLSearchParams({ d: dates, s: sport });
      return fetchJson(`${sportsDbBase}/eventsday.php?${params.toString()}`, { events: [] });
    },
    // Basic event lookup — used as the cricket match-detail fallback, since
    // TheSportsDB's stats/lineup endpoints return null on the free key for
    // every league tested (a tier-wide gate, not a league-specific gap).
    sportsdbEvent: () => {
      if (!id) return Promise.resolve({ events: [] });
      return fetchJson(`${sportsDbBase}/lookupevent.php?id=${encodeURIComponent(id)}`, { events: [] });
    },
    // YouTube highlight links per match day. Requires `d`; the league-only
    // form errors, so callers loop a bounded set of days and filter by league.
    sportsdbHighlights: () => {
      if (!dates || !sport) return Promise.resolve({ tvhighlights: [] });
      const params = new URLSearchParams({ d: dates, s: sport });
      return fetchJson(`${sportsDbBase}/eventshighlights.php?${params.toString()}`, { tvhighlights: [] });
    },
    // Note: streamed.pk endpoints are NOT proxied here — server-side Node
    // fetches to streamed.pk get blocked (TLS/JA3 fingerprinting, see
    // docs/sports/streamed-pk-api.md), so `src/Utils/sports.ts` calls
    // streamed.pk directly from the browser instead.
  };

  if (sportsRequestHandlers[request]) {
    return sportsRequestHandlers[request]();
  }

  const final_request = requests[request];
  if (!final_request) return;
  // console.log({ final_request });

  try {
    const requestUrl = new URL(final_request);
    if (API_KEY) requestUrl.searchParams.set("api_key", API_KEY);
    const response = await fetch(requestUrl.toString());
    if (!response.ok) return;
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    // Handle errors appropriately (e.g., throw a custom error or return null)
    // throw new Error("Failed to fetch data"); // Example error handling
  }
}
