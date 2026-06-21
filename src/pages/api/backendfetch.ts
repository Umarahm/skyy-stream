import type { NextApiRequest, NextApiResponse } from "next";
import axiosFetch from "@/Utils/fetch";
import { getCache, setCache } from "@/Utils/cache";

const toStringValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const toNumberValue = (value: string | string[] | undefined) => {
  const parsed = Number(toStringValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  const ApiQuery = req.query;
  const cacheKey = JSON.stringify(ApiQuery);

  const cachedResult = getCache(cacheKey);
  if (cachedResult) {
    return res.status(200).json(cachedResult);
  }

  const {
    requestID,
    id,
    language,
    page,
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
  } = ApiQuery;

  const result: any = await axiosFetch({
    requestID: toStringValue(requestID),
    id: toStringValue(id),
    language: toStringValue(language),
    page: toNumberValue(page),
    genreKeywords: toStringValue(genreKeywords),
    sortBy: toStringValue(sortBy),
    year: toNumberValue(year),
    country: toStringValue(country),
    query: toStringValue(query),
    season: toNumberValue(season),
    episode: toNumberValue(episode),
    service: toStringValue(service),
    slug: toStringValue(slug),
    ep: toStringValue(ep),
    format: toStringValue(format),
    episodeId: toStringValue(episodeId),
    provider: toStringValue(provider),
    mangaCategory: toStringValue(mangaCategory),
    chapterId: toStringValue(chapterId),
  });

  setCache(cacheKey, result);
  return res.status(200).json(result);
}
