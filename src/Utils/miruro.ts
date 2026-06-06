const MIRURO_BASE_URL =
  process.env.NEXT_PUBLIC_MIRURO_API?.trim() || "https://miruro-api-dun.vercel.app";

type MiruroListResponse = {
  results?: any[];
  page?: number;
  perPage?: number;
  total?: number;
  hasNextPage?: boolean;
};

const fetchJson = async <T>(url: string, fallback: T): Promise<T> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch (error) {
    return fallback;
  }
};

export const getMiruroTrending = async (page?: number): Promise<MiruroListResponse> => {
  const suffix = page ? `?page=${page}` : "";
  return fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/trending${suffix}`, {
    results: [],
  });
};

export const getMiruroPopular = async (page?: number): Promise<MiruroListResponse> => {
  const suffix = page ? `?page=${page}` : "";
  return fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/popular${suffix}`, {
    results: [],
  });
};

export const getMiruroRecent = async (page?: number): Promise<MiruroListResponse> => {
  const suffix = page ? `?page=${page}` : "";
  return fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/recent${suffix}`, {
    results: [],
  });
};

export const getMiruroUpcoming = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/upcoming`, { results: [] });

export const getMiruroSpotlight = async (): Promise<MiruroListResponse> =>
  fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/spotlight`, { results: [] });

export const getMiruroInfo = async (id: string | number): Promise<any> =>
  fetchJson<any>(`${MIRURO_BASE_URL}/info/${id}`, null);

export const getMiruroEpisodes = async (id: string | number): Promise<any> =>
  fetchJson<any>(`${MIRURO_BASE_URL}/episodes/${id}`, null);

export const getMiruroWatchByEpisodeId = async (episodeId: string): Promise<any> => {
  const trimmed = String(episodeId || "").replace(/^\/+/, "");
  if (!trimmed) return null;
  return fetchJson<any>(`${MIRURO_BASE_URL}/${trimmed}`, null);
};

export const getMiruroSearch = async (
  query: string,
  page = 1,
): Promise<MiruroListResponse> => {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return { results: [], page: 1, perPage: 20, total: 0, hasNextPage: false };
  const params = new URLSearchParams({
    query: trimmedQuery,
    page: String(page),
  });
  return fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/search?${params.toString()}`, {
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
  const params = new URLSearchParams({ query: trimmedQuery });
  const response = await fetchJson<any>(
    `${MIRURO_BASE_URL}/suggestions?${params.toString()}`,
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
  const params = new URLSearchParams({
    genre: String(genre || "Action"),
    format,
    page: String(page),
  });
  return fetchJson<MiruroListResponse>(`${MIRURO_BASE_URL}/filter?${params.toString()}`, {
    results: [],
    page: 1,
    perPage: 20,
    total: 0,
    hasNextPage: false,
  });
};

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
