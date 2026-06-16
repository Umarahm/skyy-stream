const ANILIST_URL =
  process.env.NEXT_PUBLIC_ANILIST_GRAPHQL_URL?.trim() ||
  process.env.ANILIST_GRAPHQL_URL?.trim() ||
  "https://graphql.anilist.co";

type Variables = Record<string, unknown>;

export type AniListMedia = {
  id: number;
  idMal?: number;
  title?: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage?: {
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
  description?: string;
  episodes?: number;
  chapters?: number;
  averageScore?: number;
  format?: string;
  status?: string;
  genres?: string[];
  siteUrl?: string;
};

const requestAniList = async <T>({
  query,
  variables = {},
}: {
  query: string;
  variables?: Variables;
}): Promise<T> => {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`AniList request failed with ${res.status}`);
  }

  const data = await res.json();
  if (data?.errors?.length) {
    throw new Error(data.errors[0]?.message || "AniList request error");
  }

  return data.data;
};

export const getAniListHomeData = async () => {
  const data = await requestAniList<{
    trendingAnime: { media: AniListMedia[] };
    popularAnime: { media: AniListMedia[] };
    trendingManga: { media: AniListMedia[] };
    popularManga: { media: AniListMedia[] };
  }>({
    query: `
      query {
        trendingAnime: Page(page: 1, perPage: 20) {
          media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            description(asHtml: false)
            episodes
            averageScore
            format
            status
            genres
            siteUrl
          }
        }
        popularAnime: Page(page: 1, perPage: 20) {
          media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            description(asHtml: false)
            episodes
            averageScore
            format
            status
            genres
            siteUrl
          }
        }
        trendingManga: Page(page: 1, perPage: 20) {
          media(type: MANGA, sort: TRENDING_DESC, isAdult: false) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            description(asHtml: false)
            chapters
            averageScore
            format
            status
            genres
            siteUrl
          }
        }
        popularManga: Page(page: 1, perPage: 20) {
          media(type: MANGA, sort: POPULARITY_DESC, isAdult: false) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            description(asHtml: false)
            chapters
            averageScore
            format
            status
            genres
            siteUrl
          }
        }
      }
    `,
  });

  return data;
};

export const getAniListMediaByType = async ({
  type,
  page = 1,
  perPage = 20,
  search,
  sort = "TRENDING_DESC",
}: {
  type: "ANIME" | "MANGA";
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
}) => {
  const data = await requestAniList<{
    Page: {
      pageInfo: {
        currentPage: number;
        hasNextPage: boolean;
        total: number;
        lastPage: number;
      };
      media: AniListMedia[];
    };
  }>({
    query: `
      query ($page: Int, $perPage: Int, $type: MediaType, $search: String, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { currentPage hasNextPage total lastPage }
          media(type: $type, search: $search, sort: $sort, isAdult: false) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            bannerImage
            description(asHtml: false)
            episodes
            chapters
            averageScore
            format
            status
            genres
            siteUrl
          }
        }
      }
    `,
    variables: { page, perPage, type, search, sort: [sort] },
  });

  return data.Page;
};

export const getAniListAnimeDetails = async (id: number) => {
  const data = await requestAniList<{
    Media: AniListMedia & {
      season?: string;
      seasonYear?: number;
      duration?: number;
      source?: string;
      startDate?: { day?: number; month?: number; year?: number };
      endDate?: { day?: number; month?: number; year?: number };
      studios?: {
        nodes: {
          name: string;
        }[];
      };
      nextAiringEpisode?: {
        episode: number;
      };
      trailer?: {
        site?: string;
        id?: string;
      };
      streamingEpisodes?: {
        title?: string;
        thumbnail?: string;
        url?: string;
        site?: string;
      }[];
      externalLinks?: {
        site?: string;
        url?: string;
      }[];
    };
  }>({
    query: `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          idMal
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          description(asHtml: false)
          episodes
          averageScore
          format
          status
          genres
          siteUrl
          season
          seasonYear
          duration
          source
          startDate { day month year }
          endDate { day month year }
          nextAiringEpisode { episode }
          trailer { site id }
          studios(isMain: true) { nodes { name } }
          streamingEpisodes { title thumbnail url site }
          externalLinks { site url }
        }
      }
    `,
    variables: { id },
  });

  return data.Media;
};

export const getAniListMangaDetails = async (id: number) => {
  const data = await requestAniList<{
    Media: AniListMedia & {
      volumes?: number;
      source?: string;
      startDate?: { day?: number; month?: number; year?: number };
      endDate?: { day?: number; month?: number; year?: number };
      siteUrl?: string;
    };
  }>({
    query: `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          id
          idMal
          title { romaji english native }
          coverImage { large medium }
          bannerImage
          description(asHtml: false)
          chapters
          volumes
          averageScore
          format
          status
          genres
          siteUrl
          source
          startDate { day month year }
          endDate { day month year }
        }
      }
    `,
    variables: { id },
  });

  return data.Media;
};
