import axiosFetch from "./fetchBackend";

type MiruroListResponse = {
  results?: any[];
  page?: number;
  perPage?: number;
  total?: number;
  hasNextPage?: boolean;
};

const fetchJson = async <T>(
  requestID: string,
  params: Record<string, any>,
  fallback: T,
): Promise<T> => {
  try {
    const response = await axiosFetch({ requestID, ...params });
    return (response ?? fallback) as T;
  } catch (error) {
    return fallback;
  }
};

export const getMiruroTrending = async (page?: number): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>("animeTrending", { page }, {
    results: [],
  });
};

export const getMiruroPopular = async (page?: number): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>("animePopular", { page }, {
    results: [],
  });
};

export const getMiruroRecent = async (page?: number): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>("animeRecent", { page }, {
    results: [],
  });
};

export const getMiruroUpcoming = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>("animeUpcoming", {}, { results: [] });

export const getMiruroSpotlight = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>("animeSpotlight", {}, { results: [] });

export const getMiruroInfo = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeInfo", { id }, null);

export const getMiruroEpisodes = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeEpisodes", { id }, null);

export const getMiruroWatchByEpisodeId = async (episodeId: string): Promise<any> => {
  const trimmed = String(episodeId || "").replace(/^\/+/, "");
  if (!trimmed) return null;
  return fetchJson<any>("animeWatchEpisode", { episodeId: trimmed }, null);
};

export const getMiruroSearch = async (
  query: string,
  page = 1,
): Promise<MiruroListResponse> => {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return { results: [], page: 1, perPage: 20, total: 0, hasNextPage: false };
  return fetchJson<MiruroListResponse>("animeSearch", { query: trimmedQuery, page }, {
    results: [],
    page: 1,
    perPage: 20,
    total: 0,
    hasNextPage: false,
  });
};

export const getMiruroSuggestions = async (query: string): Promise<any[]> => {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];
  const response = await fetchJson<any>(
    "animeSuggestions",
    { query: trimmedQuery },
    { results: [] },
  );
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.suggestions)) return response.suggestions;
  return [];
};

export const getMiruroFiltered = async (
  genre: string,
  format: "TV" | "MOVIE",
  page = 1,
): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>("animeFilter", {
    genreKeywords: String(genre || "Action"),
    format,
    page,
  }, {
    results: [],
    page: 1,
    perPage: 20,
    total: 0,
    hasNextPage: false,
  });
};

export const getMiruroSchedule = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>("animeSchedule", {}, { results: [] });

export const getMiruroDisplayTitle = (item: any): string =>
  item?.title?.english ||
  item?.title?.romaji ||
  item?.title?.native ||
  item?.name ||
  item?.title ||
  "Untitled";

export const getMiruroPoster = (item: any): string =>
  item?.coverImage?.extraLarge ||
  item?.coverImage?.large ||
  item?.image ||
  item?.poster ||
  "/images/logo.svg";

export const getMiruroBanner = (item: any): string =>
  item?.bannerImage || getMiruroPoster(item);

const formatMediaLabel = (value: string) => value.replace(/_/g, " ");

export const getMiruroMediaLabel = (item: any): string => {
  if (item?.format) return formatMediaLabel(String(item.format));
  if (item?.source) return formatMediaLabel(String(item.source));
  return "ANIME";
};
