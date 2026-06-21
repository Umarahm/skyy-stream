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

export const getMiruroTrending = async (
  page?: number,
): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>(
    "animeTrending",
    { page },
    {
      results: [],
    },
  );
};

export const getMiruroPopular = async (
  page?: number,
): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>(
    "animePopular",
    { page },
    {
      results: [],
    },
  );
};

export const getMiruroRecent = async (
  page?: number,
): Promise<MiruroListResponse> => {
  return fetchJson<MiruroListResponse>(
    "animeRecent",
    { page },
    {
      results: [],
    },
  );
};

export const getMiruroUpcoming = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>("animeUpcoming", {}, { results: [] });

export const getMiruroSpotlight = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>("animeSpotlight", {}, { results: [] });

export const getMiruroInfo = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeInfo", { id }, null);

export const getMiruroRelations = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeRelations", { id }, { relations: [] });

export const getMiruroRecommendations = async (
  id: string | number,
): Promise<any> =>
  fetchJson<any>("animeRecommendations", { id }, { recommendations: [] });

export const getMiruroCharacters = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeCharacters", { id }, { characters: { edges: [] } });

export const getMiruroEpisodes = async (id: string | number): Promise<any> =>
  fetchJson<any>("animeEpisodes", { id }, null);

export const getMiruroWatchByEpisodeId = async (
  episodeId: string,
): Promise<any> => {
  const trimmed = String(episodeId || "").replace(/^\/+/, "");
  if (!trimmed) return null;
  return fetchJson<any>("animeWatchEpisode", { episodeId: trimmed }, null);
};

export const getMiruroSearch = async (
  query: string,
  page = 1,
): Promise<MiruroListResponse> => {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery)
    return { results: [], page: 1, perPage: 20, total: 0, hasNextPage: false };
  return fetchJson<MiruroListResponse>(
    "animeSearch",
    { query: trimmedQuery, page },
    {
      results: [],
      page: 1,
      perPage: 20,
      total: 0,
      hasNextPage: false,
    },
  );
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
  return fetchJson<MiruroListResponse>(
    "animeFilter",
    {
      genreKeywords: String(genre || "Action"),
      format,
      page,
    },
    {
      results: [],
      page: 1,
      perPage: 20,
      total: 0,
      hasNextPage: false,
    },
  );
};

export const getMiruroSchedule = async (
  page = 1,
): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>(
    "animeSchedule",
    { page },
    {
      results: [],
      page: 1,
      perPage: 20,
      total: 0,
      hasNextPage: false,
    },
  );

export const getMiruroScheduleAll = async (
  maxPages = 10,
): Promise<MiruroListResponse> => {
  const pages = await Promise.all(
    Array.from({ length: maxPages }, (_, index) =>
      getMiruroSchedule(index + 1),
    ),
  );

  const seen = new Set<string>();
  const results: any[] = [];

  pages.forEach((pageData) => {
    (pageData?.results || []).forEach((item) => {
      const key = String(
        item?.id || item?.aniId || item?.malId || item?.airingAt,
      );
      if (seen.has(key)) return;
      seen.add(key);
      results.push(item);
    });
  });

  const lastPage = pages[pages.length - 1];

  return {
    results,
    page: maxPages,
    perPage: lastPage?.perPage,
    total: lastPage?.total,
    hasNextPage: lastPage?.hasNextPage,
  };
};

const SCHEDULE_PAST_DAYS = 0;
const SCHEDULE_FUTURE_DAYS = 3;

export const normalizeScheduleDay = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const isSameScheduleDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getScheduleDayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const getScheduleFallbackDays = (): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from(
    { length: SCHEDULE_PAST_DAYS + SCHEDULE_FUTURE_DAYS + 1 },
    (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index - SCHEDULE_PAST_DAYS);
      return date;
    },
  );
};

export const getScheduleDaysFromData = (items: any[]): Date[] => {
  const dayMap = new Map<string, Date>();

  items.forEach((item) => {
    if (!item?.airingAt) return;
    const day = normalizeScheduleDay(item.airingAt);
    const key = getScheduleDayKey(day);
    if (!dayMap.has(key)) dayMap.set(key, day);
  });

  return Array.from(dayMap.values()).sort((a, b) => a.getTime() - b.getTime());
};

export const getDefaultScheduleDay = (days: Date[]): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return days.find((day) => isSameScheduleDay(day, today)) || today;
};

export const filterScheduleByDay = (items: any[], day: Date): any[] =>
  items
    .filter((item) => {
      if (!item?.airingAt) return false;
      return isSameScheduleDay(normalizeScheduleDay(item.airingAt), day);
    })
    .sort((a, b) => a.airingAt - b.airingAt);

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
