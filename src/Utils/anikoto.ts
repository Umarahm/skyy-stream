import axiosFetch from "./fetchBackend";

type AnikotoHomeResponse = {
  ok?: boolean;
  cached?: boolean;
  data?: {
    spotlight?: any[];
    latestEpisodes?: any[];
    newRelease?: any[];
    newAdded?: any[];
    justCompleted?: any[];
    topDay?: any[];
    topWeek?: any[];
    topMonth?: any[];
  };
};

type AnikotoAnimeDetailsResponse = {
  ok?: boolean;
  data?: any;
};

type AnikotoWatchResponse = {
  ok?: boolean;
  data?: any;
};

type AnikotoSearchResponse = {
  ok?: boolean;
  data?: any;
  results?: any[];
};

const WATCH_CACHE_TTL_MS = 10000;
const watchInFlightRequests = new Map<string, Promise<AnikotoWatchResponse>>();
const watchResponseCache = new Map<
  string,
  { timestamp: number; value: AnikotoWatchResponse }
>();

export const getAnikotoHome = async (): Promise<AnikotoHomeResponse> => {
  try {
    const response = await axiosFetch({ requestID: "anikotoHome" });
    return response?.data ? response : { ok: false, cached: false, data: {} };
  } catch (error) {
    return { ok: false, cached: false, data: {} };
  }
};

export const getAnikotoAnimeDetails = async (
  slug: string,
): Promise<AnikotoAnimeDetailsResponse> => {
  try {
    const response = await axiosFetch({
      requestID: "anikotoAnimeDetails",
      slug,
    });
    return response?.data ? response : { ok: false, data: null };
  } catch (error) {
    return { ok: false, data: null };
  }
};

const extractSlug = (item: any): string => {
  if (!item) return "";
  if (typeof item?.slug === "string" && item.slug.trim())
    return item.slug.trim();
  if (typeof item?.href === "string" && item.href.trim()) {
    const cleaned = item.href.split("?")[0];
    const parts = cleaned.split("/").filter(Boolean);
    return (parts[parts.length - 1] || "").trim();
  }
  return "";
};

const getSearchTitleCandidates = (item: any): string[] =>
  [
    item?.title,
    item?.name,
    item?.jname,
    item?.englishTitle,
    item?.titleEnglish,
    item?.titleRomaji,
  ].filter((value) => typeof value === "string" && value.trim());

const normalizeTitle = (value: string) => value.trim().replace(/\s+/g, " ");

const pickBestSearchMatch = (items: any[], keyword: string) => {
  const normalizedKeyword = normalizeTitle(keyword);
  const loweredKeyword = normalizedKeyword.toLowerCase();
  const rank = (item: any) => {
    const titles = getSearchTitleCandidates(item).map((title) =>
      normalizeTitle(title),
    );
    if (titles.some((title) => title === normalizedKeyword)) return 0;
    if (titles.some((title) => title.toLowerCase() === loweredKeyword))
      return 1;
    if (titles.some((title) => title.startsWith(normalizedKeyword))) return 2;
    if (titles.some((title) => title.toLowerCase().startsWith(loweredKeyword)))
      return 3;
    if (titles.some((title) => title.includes(normalizedKeyword))) return 4;
    if (titles.some((title) => title.toLowerCase().includes(loweredKeyword)))
      return 5;
    return 999;
  };

  const ranked = [...items]
    .map((item) => ({ item, score: rank(item) }))
    .sort((a, b) => a.score - b.score);
  return ranked[0]?.score === 999 ? null : ranked[0]?.item || null;
};

export const resolveAnikotoSlugFromKeyword = async (
  keyword: string,
): Promise<string | null> => {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return null;

  try {
    const response: AnikotoSearchResponse = await axiosFetch({
      requestID: "anikotoSearch",
      query: trimmedKeyword,
    });
    const rawList =
      response?.data?.results ||
      response?.data?.animes ||
      response?.results ||
      response?.data ||
      [];
    const list = Array.isArray(rawList) ? rawList : [];
    if (list.length === 0) return null;
    const matched = pickBestSearchMatch(list, trimmedKeyword);
    const slug = extractSlug(matched);
    if (slug) return slug;
    const firstSlug = extractSlug(list[0]);
    if (firstSlug) return firstSlug;
  } catch (error) {
    return null;
  }

  return null;
};

export const getAnikotoWatch = async (
  slug: string,
  ep: string | number,
): Promise<AnikotoWatchResponse> => {
  const cacheKey = `${slug}::${ep}`;
  const now = Date.now();
  const cached = watchResponseCache.get(cacheKey);
  if (cached && now - cached.timestamp < WATCH_CACHE_TTL_MS) {
    return cached.value;
  }

  const existingInFlight = watchInFlightRequests.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async () => {
    const response: AnikotoWatchResponse = await axiosFetch({
      requestID: "anikotoWatch",
      slug,
      ep,
    });
    if (response?.data) {
      watchResponseCache.set(cacheKey, {
        timestamp: Date.now(),
        value: response,
      });
      return response;
    }
    const fallback = { ok: false, data: null };
    watchResponseCache.set(cacheKey, {
      timestamp: Date.now(),
      value: fallback,
    });
    return fallback;
  })();

  watchInFlightRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    watchInFlightRequests.delete(cacheKey);
  }
};

export const getAnikotoWatchByKeyword = async (
  keyword: string,
  ep: string | number,
): Promise<AnikotoWatchResponse> => {
  const slug = await resolveAnikotoSlugFromKeyword(keyword);
  if (!slug) return { ok: false, data: null };
  return getAnikotoWatch(slug, ep);
};
