import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "@/styles/Detail.module.scss";
import Carousel from "@/components/Carousel";
import Skeleton from "react-loading-skeleton";
import Head from "next/head";
import Link from "next/link";
import { FaPlay } from "react-icons/fa";
import { BsShare } from "react-icons/bs";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { navigatorShare } from "@/Utils/share";
import { getAnikotoAnimeDetails, getAnikotoWatchByKeyword } from "@/Utils/anikoto";
import AnimeMetaDetails from "./AnimeMetaDetails";
import ProviderCheckModal, { type ProviderProbeItem } from "./ProviderCheckModal";
import axiosFetch from "@/Utils/fetchBackend";
import { getAniListAnimeDetails } from "@/Utils/anilist";
import Player from "@/components/Artplayer";
import {
  getMiruroDisplayTitle,
  getMiruroEpisodes,
  getMiruroCharacters,
  getMiruroInfo,
  getMiruroMediaLabel,
  getMiruroPoster,
  getMiruroWatchByEpisodeId,
} from "@/Utils/miruro";

const HIDDEN_PROVIDERS = new Set(["bonk", "hop", "bee", "animedunya"]);
const STREAM_PROBE_TIMEOUT_MS = 7000;

const shuffleArray = <T,>(input: T[]) => {
  const copy = [...input];
  for (let idx = copy.length - 1; idx > 0; idx -= 1) {
    const rand = Math.floor(Math.random() * (idx + 1));
    [copy[idx], copy[rand]] = [copy[rand], copy[idx]];
  }
  return copy;
};

const buildAnimeRealmsProxyUrl = (streamUrl: string, referer: string) => {
  const template =
    process.env.NEXT_PUBLIC_ANIME_REALMS_PROXY ||
    process.env.ANIME_REALMS_PROXY ||
    "https://portal.animerealms.org/fetch?url={url}&ref={ref}";
  const normalizedRef = referer
    ? referer.startsWith("http")
      ? referer
      : `https://${referer}`
    : "";
  if (template.includes("{url}")) {
    return template
      .replace("{url}", encodeURIComponent(streamUrl))
      .replace("{ref}", encodeURIComponent(normalizedRef));
  }
  const joiner = template.includes("?") ? "&" : "?";
  return `${template}${joiner}url=${encodeURIComponent(streamUrl)}&ref=${encodeURIComponent(normalizedRef)}`;
};

const buildMiruroProxyUrl = (streamUrl: string, referer: string) => {
  const base =
    process.env.NEXT_PUBLIC_MIRURO_PROXY_URL?.trim() ||
    "https://aonime-proxy.skyyplay-anime.workers.dev";
  if (base.includes("{url}")) {
    return base
      .replace("{url}", encodeURIComponent(streamUrl))
      .replace("{referer}", encodeURIComponent(referer));
  }
  const cleanBase = base.replace(/\/+$/, "");
  const refererQuery = referer ? `&referer=${encodeURIComponent(referer)}` : "";
  return `${cleanBase}/fetch?url=${encodeURIComponent(streamUrl)}${refererQuery}`;
};

const getEpisodeIdLookupForEpisode = (episodesPayload: any, episodeNo: number) => {
  const providers = episodesPayload?.providers || {};
  const lookup: Record<string, { sub?: string; dub?: string }> = {};
  Object.entries(providers).forEach(([providerName, providerDataRaw]: [string, any]) => {
    const provider = String(providerName || "").toLowerCase();
    if (!provider || HIDDEN_PROVIDERS.has(provider)) return;
    const providerData = providerDataRaw || {};
    const episodeCollections = providerData?.episodes || {};
    const store = (lookup[provider] ||= {});
    Object.entries(episodeCollections).forEach(([key, listRaw]: [string, any]) => {
      if (!Array.isArray(listRaw) || listRaw.length === 0) return;
      const lowered = String(key || "").toLowerCase();
      const audio: "sub" | "dub" = lowered.includes("dub") ? "dub" : "sub";
      const match = listRaw.find((episode: any) => Number(episode?.number || 0) === episodeNo);
      if (match?.id) {
        store[audio] = match.id;
      }
    });
  });
  return lookup;
};

const getProviderAudioSupport = (episodesPayload: any) => {
  const providers = episodesPayload?.providers || {};
  const support: Record<string, { sub: boolean; dub: boolean }> = {};
  Object.entries(providers).forEach(([providerName, providerDataRaw]: [string, any]) => {
    const provider = String(providerName || "").toLowerCase();
    if (!provider || HIDDEN_PROVIDERS.has(provider)) return;
    const providerData = providerDataRaw || {};
    const episodeCollections = providerData?.episodes || {};
    const store = (support[provider] ||= { sub: false, dub: false });
    Object.entries(episodeCollections).forEach(([key, listRaw]: [string, any]) => {
      if (!Array.isArray(listRaw) || listRaw.length === 0) return;
      const lowered = String(key || "").toLowerCase();
      if (lowered.includes("dub")) store.dub = true;
      if (lowered.includes("sub") || !lowered.includes("dub")) store.sub = true;
      const hasEpisodeTaggedDub = listRaw.some((episode: any) =>
        String(episode?.title || "").toLowerCase().includes("dub"),
      );
      if (hasEpisodeTaggedDub) store.dub = true;
    });
  });
  return support;
};

const mapMiruroWatchToSources = (payload: any, provider: string, audioType: "sub" | "dub") => {
  const providerName = String(provider || "").toLowerCase();
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  let usableStreams = streams
    .filter((item: any) => {
      const streamType = String(item?.type || "").toLowerCase();
      return Boolean(item?.url) && (streamType === "hls" || streamType === "mp4");
    })
    .filter((item: any) => item?.isActive !== false);

  if (providerName === "ally") {
    // Ally MP4 is unreliable; keep only HLS streams.
    usableStreams = usableStreams.filter(
      (item: any) => String(item?.type || "").toLowerCase() === "hls",
    );
  }

  return usableStreams.map((stream: any, idx: number) => {
    const ref = stream?.referer || "";
    const proxyUrl =
      providerName === "kiwi"
        ? buildAnimeRealmsProxyUrl(stream.url, ref)
        : buildMiruroProxyUrl(stream.url, ref);
    const streamFormat = String(stream?.type || "").toLowerCase() === "hls" ? "hls" : "mp4";
    return {
      type: audioType,
      server: `${providerName.toUpperCase()} ${stream?.server || stream?.quality || streamFormat.toUpperCase()}`,
      proxyUrl,
      streamFormat,
      rawStream: stream,
      idx,
    };
  });
};

const probeStreamAvailability = async (url: string) => {
  if (!url) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const type = String(response.headers.get("content-type") || "").toLowerCase();
    return (
      type.includes("mpegurl") ||
      type.includes("video") ||
      type.includes("octet-stream") ||
      type.includes("application/vnd.apple")
    );
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const JapaneseAnimeDetailPage = () => {
  const params = useSearchParams();
  const [animeData, setAnimeData] = useState<any>(null);
  const [episodesData, setEpisodesData] = useState<any>(null);
  const [charactersData, setCharactersData] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [anilistEpisodeCount, setAnilistEpisodeCount] = useState<number | null>(null);
  const [previewEpisode, setPreviewEpisode] = useState<number | null>(null);
  const [previewProvider, setPreviewProvider] = useState("kiwi");
  const [previewType, setPreviewType] = useState<"sub" | "dub">("sub");
  const [previewSources, setPreviewSources] = useState<any[]>([]);
  const [previewSourceIndex, setPreviewSourceIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAnikotoTypes, setPreviewAnikotoTypes] = useState<Array<"sub" | "dub">>(["sub"]);
  const lastStreamToastKeyRef = useRef("");
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerProbeItems, setProviderProbeItems] = useState<ProviderProbeItem[]>([]);
  const [providerProbeEpisode, setProviderProbeEpisode] = useState<number | null>(null);
  const manualSelectionRef = useRef<{ episode: number; provider: string; type: "sub" | "dub" } | null>(
    null,
  );
  const modalRunIdRef = useRef(0);

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
        setEpisodesLoading(Boolean(id));
        let details: any = null;
        let episodeInfo: any = null;
        let charactersInfo: any = null;
        let aniListDetails: any = null;

        if (id) {
          const numericId = Number(id);
          const [info, episodes, characters, aniListInfo] = await Promise.all([
            getMiruroInfo(id),
            getMiruroEpisodes(id),
            getMiruroCharacters(id),
            Number.isFinite(numericId) ? getAniListAnimeDetails(numericId) : Promise.resolve(null),
          ]);
          details = info;
          episodeInfo = episodes;
          charactersInfo = characters;
          aniListDetails = aniListInfo;
        } else if (slug) {
          const response = await getAnikotoAnimeDetails(slug);
          details = response?.data;
        }

        setAnimeData(details);
        setEpisodesData(episodeInfo);
        setCharactersData(charactersInfo);
        setAnilistEpisodeCount(
          typeof aniListDetails?.episodes === "number" && aniListDetails.episodes > 0
            ? aniListDetails.episodes
            : null,
        );
        const queryTitle = sanitizeTitleForTmdb(
          getMiruroDisplayTitle(details) || details?.title || details?.titleJp || "",
        );
        const tmdbMatch = queryTitle ? await findAnimeTmdbMatch(queryTitle) : null;
        const imageArr = tmdbMatch ? await getTmdbBackdrops(tmdbMatch) : [];
        setImages(imageArr.length > 0 ? imageArr : ["/images/logo.svg"]);
      } catch (error) {
        console.error(error);
      } finally {
        setEpisodesLoading(false);
        setLoading(false);
      }
    };
    load();
  }, [id, slug]);

  const title = getMiruroDisplayTitle(animeData) || animeData?.title || animeData?.titleJp || "Anime";
  const aniListScoreRaw =
    typeof animeData?.averageScore === "number"
      ? animeData.averageScore
      : typeof animeData?.meanScore === "number"
        ? animeData.meanScore
        : null;
  const aniListScoreText =
    typeof aniListScoreRaw === "number" && aniListScoreRaw > 0
      ? `${(aniListScoreRaw / 10).toFixed(1)}`
      : null;
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
  const providerEpisodeLookup = useMemo(
    () =>
      previewEpisode && episodesData
        ? getEpisodeIdLookupForEpisode(episodesData, previewEpisode)
        : {},
    [episodesData, previewEpisode],
  );
  const providerAudioSupport = useMemo(() => getProviderAudioSupport(episodesData), [episodesData]);
  const availablePreviewProviders = useMemo(() => {
    const keys = Object.keys(providerEpisodeLookup || {}).filter((providerName) => {
      const entry = providerEpisodeLookup?.[providerName] || {};
      return Boolean(entry?.sub || entry?.dub);
    });
    if (!keys.includes("anikoto")) keys.push("anikoto");
    if (keys.includes("kiwi")) return ["kiwi", ...keys.filter((providerName) => providerName !== "kiwi")];
    return keys;
  }, [providerEpisodeLookup]);
  const providersByAudioType = useMemo(() => {
    const subProviders = availablePreviewProviders.filter((providerName) => {
      const episodeEntry = providerEpisodeLookup?.[providerName];
      if (episodeEntry?.sub) return true;
      return Boolean(providerAudioSupport?.[providerName]?.sub);
    });
    const dubProviders = availablePreviewProviders.filter((providerName) => {
      const episodeEntry = providerEpisodeLookup?.[providerName];
      if (episodeEntry?.dub) return true;
      return Boolean(providerAudioSupport?.[providerName]?.dub);
    });
    return { sub: subProviders, dub: dubProviders };
  }, [availablePreviewProviders, providerEpisodeLookup, providerAudioSupport]);
  const createSourceFetcher = (
    episodeNo: number,
    lookup: Record<string, { sub?: string; dub?: string }>,
  ) => {
    return async (providerName: string, audioType: "sub" | "dub") => {
      if (providerName === "anikoto") {
        const keyword = getMiruroDisplayTitle(animeData) || title;
        const watchPayload = await getAnikotoWatchByKeyword(keyword, episodeNo);
        const sourceList = Array.isArray(watchPayload?.data?.sources)
          ? watchPayload.data.sources
          : [];
        const normalized = sourceList
          .map((source: any, idx: number) => {
            const type =
              String(source?.type || "").toLowerCase().includes("dub") ? "dub" : "sub";
            const streamUrl = source?.proxyUrl || source?.url || source?.src || "";
            if (!streamUrl) return null;
            return {
              type,
              server: source?.server || source?.name || `ANIKOTO ${idx + 1}`,
              proxyUrl: String(streamUrl),
              streamFormat:
                String(source?.streamFormat || source?.format || "")
                  .toLowerCase()
                  .includes("mp4")
                  ? "mp4"
                  : "hls",
            };
          })
          .filter(Boolean);
        const exactType = normalized.filter((source: any) => source.type === audioType);
        if (exactType.length > 0) return { audioType, sources: exactType };
        const fallbackType = normalized[0]?.type === "dub" ? "dub" : "sub";
        return { audioType: fallbackType as "sub" | "dub", sources: normalized };
      }
      const episodeEntry = lookup?.[providerName] || {};
      const episodeId =
        (audioType === "dub" ? episodeEntry?.dub : episodeEntry?.sub) ||
        episodeEntry?.sub ||
        episodeEntry?.dub;
      if (!episodeId) return { audioType, sources: [] };
      const watchPayload = await getMiruroWatchByEpisodeId(episodeId);
      const mapped = mapMiruroWatchToSources(watchPayload, providerName, audioType);
      return { audioType, sources: mapped };
    };
  };
  const availablePreviewTypes = useMemo((): Array<"sub" | "dub"> => {
    if (previewProvider === "anikoto") {
      return previewAnikotoTypes.length > 0 ? previewAnikotoTypes : ["sub"];
    }
    const list: Array<"sub" | "dub"> = [];
    if (providersByAudioType.sub.length > 0) list.push("sub");
    if (providersByAudioType.dub.length > 0) list.push("dub");
    return list.length > 0 ? list : ["sub"];
  }, [previewProvider, previewAnikotoTypes, providersByAudioType]);
  const selectedPreviewSource = previewSources[previewSourceIndex] || null;
  const hasPreviewRequest = Boolean(previewEpisode);
  const isInlinePreview = hasPreviewRequest;

  useEffect(() => {
    if (availablePreviewProviders.length === 0) return;
    if (!availablePreviewProviders.includes(previewProvider)) {
      setPreviewProvider(availablePreviewProviders[0]);
    }
  }, [availablePreviewProviders, previewProvider]);

  useEffect(() => {
    if (!availablePreviewTypes.includes(previewType)) {
      setPreviewType(availablePreviewTypes[0] || "sub");
    }
  }, [availablePreviewTypes, previewType]);

  useEffect(() => {
    if (!previewEpisode || previewProvider === "anikoto") return;
    const supportsSelectedType = Boolean(providerEpisodeLookup?.[previewProvider]?.[previewType]);
    if (supportsSelectedType) return;
    const fallbackProviders =
      previewType === "dub" ? providersByAudioType.dub : providersByAudioType.sub;
    if (fallbackProviders.length > 0 && fallbackProviders[0] !== previewProvider) {
      setPreviewProvider(fallbackProviders[0]);
    }
  }, [previewEpisode, previewProvider, previewType, providerEpisodeLookup, providersByAudioType]);

  useEffect(() => {
    const loadInlinePreview = async () => {
      if (!id || !previewEpisode || !previewProvider) return;
      if (
        manualSelectionRef.current &&
        manualSelectionRef.current.episode === previewEpisode &&
        manualSelectionRef.current.provider === previewProvider &&
        manualSelectionRef.current.type === previewType
      ) {
        manualSelectionRef.current = null;
        return;
      }
      try {
        setPreviewLoading(true);
        if (previewProvider === "anikoto") {
          const keyword = getMiruroDisplayTitle(animeData) || title;
          const watchPayload = await getAnikotoWatchByKeyword(keyword, previewEpisode);
          const anikotoSources = Array.isArray(watchPayload?.data?.sources)
            ? watchPayload.data.sources
            : [];
          const typeSet = new Set<"sub" | "dub">();
          const normalized = anikotoSources
            .map((source: any, idx: number) => {
              const type =
                String(source?.type || "").toLowerCase().includes("dub") ? "dub" : "sub";
              typeSet.add(type);
              const streamUrl = source?.proxyUrl || source?.url || source?.src || "";
              if (!streamUrl) return null;
              return {
                type,
                server: source?.server || source?.name || `ANIKOTO ${idx + 1}`,
                proxyUrl: String(streamUrl),
                streamFormat:
                  String(source?.streamFormat || source?.format || "")
                    .toLowerCase()
                    .includes("mp4")
                    ? "mp4"
                    : "hls",
              };
            })
            .filter(Boolean);
          const nextTypes = Array.from(typeSet.values());
          setPreviewAnikotoTypes(nextTypes.length > 0 ? nextTypes : ["sub"]);
          const filteredByType = normalized.filter((source: any) => source.type === previewType);
          setPreviewSources(filteredByType.length > 0 ? filteredByType : normalized);
        } else {
          const preferredProviders = [
            previewProvider,
            ...(previewType === "dub" ? providersByAudioType.dub : providersByAudioType.sub),
            ...availablePreviewProviders,
          ].filter(Boolean);
          const providerOrder = Array.from(new Set(preferredProviders));
          let targetEpisodeId = "";
          let selectedProviderForSource = previewProvider;
          for (const candidateProvider of providerOrder) {
            const episodeEntry = providerEpisodeLookup?.[candidateProvider] || {};
            const candidateEpisodeId =
              (previewType === "dub" ? episodeEntry?.dub : episodeEntry?.sub) ||
              episodeEntry?.sub ||
              episodeEntry?.dub;
            if (!candidateEpisodeId) continue;
            targetEpisodeId = candidateEpisodeId;
            selectedProviderForSource = candidateProvider;
            break;
          }
          if (!targetEpisodeId) {
            setPreviewSources([]);
            setPreviewSourceIndex(0);
            return;
          }
          const watchPayload = await getMiruroWatchByEpisodeId(targetEpisodeId);
          if (selectedProviderForSource !== previewProvider) {
            setPreviewProvider(selectedProviderForSource);
          }
          const sources = mapMiruroWatchToSources(
            watchPayload,
            selectedProviderForSource,
            previewType,
          );
          setPreviewSources(sources);
        }
        setPreviewSourceIndex(0);
      } catch (error) {
        console.error(error);
        setPreviewSources([]);
      } finally {
        setPreviewLoading(false);
      }
    };
    loadInlinePreview();
  }, [
    id,
    previewEpisode,
    previewProvider,
    previewType,
    providerEpisodeLookup,
    providersByAudioType,
    availablePreviewProviders,
    animeData,
    title,
  ]);

  useEffect(() => {
    if (!previewEpisode || previewLoading || !selectedPreviewSource?.proxyUrl) return;
    const toastKey = `${previewEpisode}__${previewProvider}__${previewType}__${previewSourceIndex}__${selectedPreviewSource?.proxyUrl}`;
    if (lastStreamToastKeyRef.current === toastKey) return;
    lastStreamToastKeyRef.current = toastKey;
    toast.success(
      `You are watching ${title} • EP ${previewEpisode} (${previewType.toUpperCase()} • ${String(previewProvider || "").toUpperCase()})`,
    );
  }, [
    previewEpisode,
    previewLoading,
    selectedPreviewSource?.proxyUrl,
    previewProvider,
    previewType,
    previewSourceIndex,
    title,
  ]);

  const runProviderProbe = async (episodeNo: number, preferredAudio: "sub" | "dub") => {
    const runId = modalRunIdRef.current + 1;
    modalRunIdRef.current = runId;
    const lookup = getEpisodeIdLookupForEpisode(episodesData, episodeNo);
    const support = getProviderAudioSupport(episodesData);
    const providerCandidates = Array.from(
      new Set([
        ...Object.keys(lookup || {}),
        ...Object.keys(support || {}).filter((provider) => support?.[provider]?.[preferredAudio]),
        "anikoto",
      ]),
    ).filter(Boolean);
    const randomProviders = shuffleArray(providerCandidates);
    setProviderProbeItems(
      randomProviders.map((provider) => ({
        provider,
        status: "idle",
        message: "Waiting...",
      })),
    );
    setProviderModalOpen(true);
    setProviderProbeEpisode(episodeNo);

    const updateStatus = (
      provider: string,
      status: ProviderProbeItem["status"],
      message: string,
    ) => {
      setProviderProbeItems((current) =>
        current.map((item) => (item.provider === provider ? { ...item, status, message } : item)),
      );
    };

    const getSources = createSourceFetcher(episodeNo, lookup);

    for (const provider of randomProviders) {
      if (modalRunIdRef.current !== runId) return null;
      updateStatus(provider, "checking", "Checking for videos...");
      try {
        const { audioType, sources } = await getSources(provider, preferredAudio);
        if (!Array.isArray(sources) || sources.length === 0) {
          updateStatus(provider, "failed", "No stream sources available");
          continue;
        }
        const probePool = sources.slice(0, 3);
        let playableFound = false;
        for (const source of probePool) {
          const ok = await probeStreamAvailability(String(source?.proxyUrl || ""));
          if (ok) {
            playableFound = true;
            break;
          }
        }
        if (!playableFound) {
          updateStatus(provider, "failed", "Doesn't have the video");
          continue;
        }
        updateStatus(provider, "success", "Video found");
        return {
          provider,
          audioType,
          sources,
        };
      } catch (error) {
        updateStatus(provider, "failed", "Request failed");
      }
    }
    return null;
  };

  return (
    <>
      <Head>
        <title>Rive | Anime Detail | {title}</title>
      </Head>
      <div className={styles.DetailPage}>
        <div className={styles.biggerPic}>
          <AnimatePresence mode="wait">
            {isInlinePreview ? (
              <motion.div
                key="inline-player"
                className={styles.previewPlayerWrap}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {previewLoading ? (
                  <Skeleton className={styles.CarouselLoading} />
                ) : !selectedPreviewSource?.proxyUrl ? (
                  <div className={styles.previewEmpty}>No playable source found for this episode.</div>
                ) : (
                  <Player
                    option={{ url: selectedPreviewSource?.proxyUrl || "" }}
                    format={selectedPreviewSource?.streamFormat || "hls"}
                    className={styles.previewPlayer}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tmdb-carousel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
          <div className={styles.curvy}></div>
          <div className={styles.curvy2}></div>
          {!isInlinePreview ? (
            <div className={styles.DetailBanner}>
              <div className={styles.poster}>
                <div className={styles.curvy3}></div>
                <div className={styles.curvy4}></div>
                <div className={styles.rating}>
                  <span>
                    {animeData ? (
                      animeData?.malId || null
                    ) : (
                      <Skeleton width={28} />
                    )}
                  </span>
                </div>
                {animeData ? (
                  <div className={styles.anilistScoreBadge}>{aniListScoreText || "N/A"}</div>
                ) : (
                  <Skeleton width={42} height={18} className={styles.anilistScoreSkeleton} />
                )}
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
          ) : null}
        </div>
        <motion.div
          className={styles.biggerDetail}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <AnimeMetaDetails
            details={animeData || {}}
            episodesPayload={episodesData}
            charactersPayload={charactersData}
            animeId={id}
            loading={loading}
            episodesLoading={episodesLoading}
            anilistEpisodeCount={anilistEpisodeCount}
            previewEpisode={previewEpisode}
            previewProvider={previewProvider}
            previewType={previewType}
            previewLoading={previewLoading}
            previewSources={previewSources}
            previewSourceIndex={previewSourceIndex}
            availablePreviewProviders={availablePreviewProviders}
            availablePreviewTypes={availablePreviewTypes}
            onPreviewProviderChange={(providerName) => setPreviewProvider(providerName)}
            onPreviewTypeChange={(audioType) => setPreviewType(audioType)}
            onPreviewSourceIndexChange={(sourceIdx) => setPreviewSourceIndex(sourceIdx)}
            onEpisodePreviewSelect={async (payload) => {
              const episodeNo = Number(payload?.number || 1);
              const preferredAudio = previewType;
              const preferredProvider = String(payload?.provider || "kiwi").toLowerCase();
              setPreviewEpisode(null);
              setPreviewSources([]);
              setPreviewSourceIndex(0);
              setPreviewLoading(true);
              const result = await runProviderProbe(episodeNo, preferredAudio);
              if (!result) {
                setProviderModalOpen(false);
                setPreviewLoading(false);
                toast.error("No working stream found for this episode.");
                return;
              }
              const chosenProvider = String(result.provider || preferredProvider).toLowerCase();
              const chosenType = result.audioType === "dub" ? "dub" : "sub";
              manualSelectionRef.current = {
                episode: episodeNo,
                provider: chosenProvider,
                type: chosenType,
              };
              setPreviewType(chosenType);
              setPreviewProvider(chosenProvider);
              setPreviewEpisode(episodeNo);
              setPreviewSources(result.sources || []);
              setPreviewSourceIndex(0);
              setPreviewLoading(false);
              setProviderModalOpen(false);
            }}
          />
        </motion.div>
      </div>
      <ProviderCheckModal
        open={providerModalOpen}
        title={title}
        episode={providerProbeEpisode}
        items={providerProbeItems}
      />
    </>
  );
};

export default JapaneseAnimeDetailPage;
