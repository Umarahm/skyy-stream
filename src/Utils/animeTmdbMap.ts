import axiosFetch from "./fetchBackend";

export const mapAnimeToTmdbTv = async ({
  englishTitle,
  romajiTitle,
}: {
  englishTitle?: string;
  romajiTitle?: string;
}) => {
  const query = englishTitle || romajiTitle;
  if (!query) return null;

  try {
    const results = await axiosFetch({
      requestID: "searchMulti",
      query,
      page: 1,
    });
    const tvMatch = results?.results?.find(
      (item: any) => item?.media_type === "tv" && item?.id,
    );
    return tvMatch?.id || null;
  } catch (error) {
    return null;
  }
};
