import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "@/styles/Detail.module.scss";
import Carousel from "@/components/Carousel";
import Skeleton from "react-loading-skeleton";
import Head from "next/head";
import Link from "next/link";
import { FaPlay } from "react-icons/fa";
import { BsShare } from "react-icons/bs";
import { navigatorShare } from "@/Utils/share";
import { getAnikotoAnimeDetails } from "@/Utils/anikoto";
import AnimeMetaDetails from "./AnimeMetaDetails";
import axiosFetch from "@/Utils/fetchBackend";
import {
  getMiruroDisplayTitle,
  getMiruroEpisodes,
  getMiruroInfo,
  getMiruroMediaLabel,
  getMiruroPoster,
} from "@/Utils/miruro";

const JapaneseAnimeDetailPage = () => {
  const params = useSearchParams();
  const [animeData, setAnimeData] = useState<any>(null);
  const [episodesData, setEpisodesData] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const id = params.get("id");
  const slug = params.get("slug");

  const getTmdbImageUrl = (path?: string | null) =>
    path ? `${process.env.NEXT_PUBLIC_TMBD_IMAGE_URL}${path}` : "";

  const sanitizeTitleForTmdb = (rawTitle: string) => {
    return rawTitle
      .replace(/\bseason\s*\d+\b/gi, " ")
      .replace(/\b(s|season)\s*[ivxlcdm]+\b/gi, " ")
      .replace(/\b[ivxlcdm]{1,6}\b/gi, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/[()\-_:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const isLikelyAnimeTmdbResult = (item: any) =>
    item?.original_language === "ja" &&
    Array.isArray(item?.genre_ids) &&
    item.genre_ids.includes(16);

  const findAnimeTmdbMatch = async (title: string) => {
    const searches = [title, `${title} anime`];

    for (const query of searches) {
      const searchRes: any = await axiosFetch({
        requestID: "searchMulti",
        query,
        page: 1,
      });
      const results = (searchRes?.results || []).filter(
        (item: any) =>
          (item?.media_type === "tv" || item?.media_type === "movie") &&
          (item?.backdrop_path || item?.id),
      );
      const animeMatch =
        results.find((item: any) => item?.media_type === "tv" && isLikelyAnimeTmdbResult(item)) ||
        results.find(isLikelyAnimeTmdbResult);

      if (animeMatch) return animeMatch;
    }

    return null;
  };

  const getTmdbBackdrops = async (match: any) => {
    if (!match?.id || !match?.media_type) return [];

    const response = await axiosFetch({
      requestID: `${match.media_type}Images`,
      id: String(match.id),
    });
    const backdrops = (response?.backdrops || [])
      .slice(0, 5)
      .map((image: any) => getTmdbImageUrl(image?.file_path))
      .filter(Boolean);

    if (backdrops.length > 0) return backdrops;
    return [getTmdbImageUrl(match?.backdrop_path)].filter(Boolean);
  };

  useEffect(() => {
    const load = async () => {
      if (!id && !slug) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        let details: any = null;
        let episodeInfo: any = null;

        if (id) {
          const [info, episodes] = await Promise.all([getMiruroInfo(id), getMiruroEpisodes(id)]);
          details = info;
          episodeInfo = episodes;
        } else if (slug) {
          const response = await getAnikotoAnimeDetails(slug);
          details = response?.data;
        }

        setAnimeData(details);
        setEpisodesData(episodeInfo);
        const queryTitle = sanitizeTitleForTmdb(
          getMiruroDisplayTitle(details) || details?.title || details?.titleJp || "",
        );
        const tmdbMatch = queryTitle ? await findAnimeTmdbMatch(queryTitle) : null;
        const imageArr = tmdbMatch ? await getTmdbBackdrops(tmdbMatch) : [];
        setImages(imageArr.length > 0 ? imageArr : ["/images/logo.svg"]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, slug]);

  const title = getMiruroDisplayTitle(animeData) || animeData?.title || animeData?.titleJp || "Anime";
  const titleLength = title.length;
  const titleSizeClass =
    titleLength > 70
      ? styles.titleXs
      : titleLength > 50
        ? styles.titleSm
        : titleLength > 35
          ? styles.titleMd
          : styles.titleLg;

  const handleShare = () => {
    const shareUrl = id ? `/anime-details?id=${id}` : `/anime-detail?slug=${slug}`;
    navigatorShare({ text: title, url: shareUrl });
  };

  const watchHref = id
    ? `/anime-watch?id=${id}&ep=1&title=${encodeURIComponent(title)}`
    : animeData?.episodes?.slug || animeData?.slug
      ? `/anime-watch?slug=${animeData?.episodes?.slug || animeData?.slug}&ep=1`
      : animeData?.watchUrl || "#";

  return (
    <>
      <Head>
        <title>Rive | Anime Detail | {title}</title>
      </Head>
      <div className={styles.DetailPage}>
        <div className={styles.biggerPic}>
          {images?.length > 0 ? (
            <Carousel
              imageArr={images}
              setIndex={setIndex}
              mobileHeight="60vh"
              desktopHeight="95vh"
              objectFit={"cover"}
            />
          ) : (
            <Skeleton className={styles.CarouselLoading} />
          )}
          <div className={styles.curvy}></div>
          <div className={styles.curvy2}></div>
          <div className={styles.DetailBanner}>
            <div className={styles.poster}>
              <div className={styles.curvy3}></div>
              <div className={styles.curvy4}></div>
              <div className={styles.rating}>
                <span>
                  {animeData ? (
                    typeof animeData?.averageScore === "number" ? (
                      (animeData.averageScore / 10).toFixed(1)
                    ) : animeData?.malScore ? (
                      Number(animeData.malScore).toFixed(1)
                    ) : null
                  ) : (
                    <Skeleton width={28} />
                  )}
                </span>
              </div>
              {animeData ? (
                <img
                  src={getMiruroPoster(animeData)}
                  alt={title}
                  className={styles.animePosterImage}
                />
              ) : (
                <Skeleton height={240} width={160} borderRadius="0.5rem" />
              )}
            </div>
            <div className={styles.HomeHeroMeta}>
              <h1
                className={titleSizeClass}
                data-tooltip-id="tooltip"
                data-tooltip-content={animeData ? title : "name"}
              >
                {animeData ? title : <Skeleton />}
              </h1>
              <div className={styles.HomeHeroMetaRow2}>
                <p className={styles.type}>
                  {animeData ? getMiruroMediaLabel(animeData) : <Skeleton width={60} />}
                </p>
                {animeData ? (
                  <>
                    <Link
                      className={styles.links}
                      href={watchHref}
                      target={watchHref.startsWith("http") ? "_blank" : undefined}
                      rel={watchHref.startsWith("http") ? "noreferrer" : undefined}
                    >
                      watch <FaPlay />
                    </Link>
                    <BsShare className={styles.HomeHeroIcons} onClick={handleShare} />
                  </>
                ) : (
                  <div>
                    <Skeleton width={200} count={1} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.biggerDetail}>
          <AnimeMetaDetails
            details={animeData || {}}
            episodesPayload={episodesData}
            animeId={id}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
};

export default JapaneseAnimeDetailPage;
