import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./style.module.scss";
import Player from "@/components/Artplayer";
import VidstackPlayer from "@/components/VidstackPlayer";
import { getAnikotoWatch, getAnikotoWatchByKeyword } from "@/Utils/anikoto";
import {
  getMiruroEpisodes,
  getMiruroInfo,
  getMiruroRecommendations,
  getMiruroWatchByEpisodeId,
} from "@/Utils/miruro";
import WatchHeader from "./WatchHeader";
import WatchSourceList from "./WatchSourceList";
import WatchInfoPanel from "./WatchInfoPanel";
import WatchMediaRail from "./WatchMediaRail";
import WatchCommentsPanel from "./WatchCommentsPanel";
import WatchEpisodeList from "./WatchEpisodeList";
import type { MediaCard } from "./types";

type CaptionTrack = {
  label: string;
  file: string;
  default?: boolean;
};

type SkipSegment = {
  start: number;
  end: number;
  type: "opening" | "closing" | "recap";
  label: string;
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

const extractMiruroTracks = (payload: any): CaptionTrack[] => {
  const candidates = [
    ...(Array.isArray(payload?.tracks) ? payload.tracks : []),
    ...(Array.isArray(payload?.captions) ? payload.captions : []),
    ...(Array.isArray(payload?.subtitles) ? payload.subtitles : []),
  ];

  return candidates
    .map((track: any, idx: number) => {
      const url = track?.file || track?.url || track?.src || "";
      if (!url) return null;
      return {
        label: track?.label || track?.lang || track?.language || `Subtitle ${idx + 1}`,
        file: String(url),
        default: Boolean(track?.default),
      };
    })
    .filter(Boolean) as CaptionTrack[];
};

const mapMiruroWatchToSources = (payload: any, provider: string, audioType: "sub" | "dub") => {
  const providerName = String(provider || "").toLowerCase();
  const tracks = extractMiruroTracks(payload);
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  let usableStreams = streams.filter((item: any) => {
    const streamType = String(item?.type || "").toLowerCase();
    return Boolean(item?.url) && (streamType === "hls" || streamType === "mp4");
  });

  if (providerName === "kiwi" || providerName === "pewe") {
    // Kiwi should stay on HLS-only.
    usableStreams = usableStreams.filter((item: any) => String(item?.type || "").toLowerCase() === "hls");
  }

  if (providerName === "moo") {
    const hlsFirst = usableStreams.filter((item: any) => String(item?.type || "").toLowerCase() === "hls");
    if (hlsFirst.length > 0) {
      const preferred1080 = hlsFirst.filter((item: any) => String(item?.quality || "") === "1080p");
      usableStreams = preferred1080.length > 0 ? preferred1080 : hlsFirst;
    }
    // If moo has no HLS, allow MP4 fallback.
  }

  usableStreams = usableStreams.filter((item: any) => item?.isActive !== false);
  usableStreams.sort((a: any, b: any) => {
    const aDefault = a?.default ? 1 : 0;
    const bDefault = b?.default ? 1 : 0;
    return bDefault - aDefault;
  });

  // Miruro streams don't carry an `audio` field, so we tag every source with
  // the audioType that was used to look up this episode ID (sub or dub).
  const sources: any[] = [];
  usableStreams.forEach((stream: any, idx: number) => {
    const ref = stream?.referer || "";
    const proxyUrl =
      providerName === "kiwi"
        ? buildAnimeRealmsProxyUrl(stream.url, ref)
        : buildMiruroProxyUrl(stream.url, ref);
    const sourceFormat = String(stream?.type || "").toLowerCase() === "hls" ? "hls" : "mp4";
    sources.push({
      type: audioType,
      server: `${providerName.toUpperCase()} ${stream?.server || stream?.quality || sourceFormat.toUpperCase()}`,
      proxyUrl,
      streamFormat: sourceFormat,
      tracks,
      rawStream: stream,
      idx,
    });
  });

  return sources;
};

const getEpisodeIdLookupForEpisode = (episodesPayload: any, episodeNo: number) => {
  const providers = episodesPayload?.providers || {};
  const lookup: Record<string, { sub?: string; dub?: string }> = {};
  Object.entries(providers).forEach(([providerName, providerDataRaw]: [string, any]) => {
    const provider = String(providerName || "").toLowerCase();
    if (!provider || provider === "anikoto") return;
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

const deriveEpisodeIdForProvider = (
  baseEpisodeId: string,
  targetProvider: string,
  audioType: "sub" | "dub",
) => {
  const cleaned = String(baseEpisodeId || "").replace(/^\/+/, "");
  if (!cleaned) return "";
  const parts = cleaned.split("/");
  // Expected shape: watch/{provider}/{animeId}/{sub|dub}/{providerEpisodeSlug}
  if (parts.length < 5 || parts[0] !== "watch") return "";
  parts[1] = targetProvider;
  parts[3] = audioType;
  return parts.join("/");
};

const normalizeAudioType = (value: any): "sub" | "dub" | "" => {
  const lowered = String(value || "").toLowerCase();
  if (lowered.includes("dub")) return "dub";
  if (lowered.includes("sub")) return "sub";
  return "";
};

const normalizeSkipType = (value: any): "opening" | "closing" | "recap" | null => {
  const lowered = String(value || "").toLowerCase();
  if (lowered === "op" || lowered.includes("open") || lowered.includes("intro")) return "opening";
  if (lowered === "ed" || lowered.includes("end") || lowered.includes("clos") || lowered.includes("outro")) {
    return "closing";
  }
  if (lowered.includes("recap")) return "recap";
  return null;
};

const providerAliases: Record<string, string[]> = {
  kiwi: ["kiwi", "zoro", "hianime", "aniwatch"],
  ally: ["ally", "animepahe", "pahe"],
  pewe: ["pewe", "anidbapp", "anidb"],
  moo: ["moo", "gogo", "gogoanime"],
  anikoto: ["anikoto", "zoro", "animepahe"],
};
const HIDDEN_PROVIDERS = new Set(["bonk", "hop", "bee", "animedunya"]);

const extractSkipSegments = (
  payloads: any[],
  selectedProvider: string,
  episode: number,
): SkipSegment[] => {
  const rawEntries: any[] = [];
  const collect = (input: any) => {
    if (!input) return;
    if (Array.isArray(input)) {
      input.forEach(collect);
      return;
    }
    if (typeof input !== "object") return;
    rawEntries.push(input);
    const nestedCandidates = [
      input.skipTimes,
      input.skips,
      input.episodeSkips,
      input.segments,
      input.results,
      input.timestamps,
      input.data,
      input.aniskip,
      input.aniSkip,
    ];
    nestedCandidates.forEach(collect);
  };

  payloads.forEach(collect);

  const normalized = rawEntries
    .map((entry) => {
      const start = Number(entry?.start ?? entry?.startTime ?? entry?.from ?? entry?.begin);
      const end = Number(entry?.end ?? entry?.endTime ?? entry?.to ?? entry?.finish);
      const type = normalizeSkipType(entry?.type ?? entry?.skipType ?? entry?.segmentType ?? entry?.name);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !type) return null;
      return {
        start,
        end,
        type,
        label: type === "opening" ? "Skip Opening" : type === "closing" ? "Skip Closing" : "Skip Recap",
        provider: String(entry?.provider || entry?.source || entry?.server || "").toLowerCase(),
        episodeNo: Number(entry?.episode ?? entry?.episodeNumber ?? 0),
      };
    })
    .filter(Boolean) as Array<SkipSegment & { provider: string; episodeNo: number }>;

  const exactEpisodeMatches = normalized.filter((segment) => segment.episodeNo === episode);
  const genericEpisodeMatches = normalized.filter((segment) => segment.episodeNo <= 0);
  const episodeSegments =
    exactEpisodeMatches.length > 0
      ? exactEpisodeMatches
      : genericEpisodeMatches.length > 0
        ? genericEpisodeMatches
        : normalized;
  if (episodeSegments.length === 0) return [];

  const aliases = providerAliases[String(selectedProvider || "").toLowerCase()] || [
    String(selectedProvider || "").toLowerCase(),
  ];
  const providerMatched = episodeSegments.filter((segment) =>
    aliases.some((alias) => alias && segment.provider.includes(alias)),
  );
  const picked = providerMatched.length > 0 ? providerMatched : episodeSegments;

  return picked
    .map((segment) => ({
      start: segment.start,
      end: segment.end,
      type: segment.type,
      label: segment.label,
    }))
    .sort((a, b) => a.start - b.start);
};

const toMediaCards = (payload: any, kind: "relations" | "recommendations"): MediaCard[] => {
  const source =
    payload?.[kind] ||
    payload?.data?.[kind] ||
    payload?.results ||
    payload?.edges ||
    payload?.nodes ||
    [];
  const list = Array.isArray(source) ? source : [];

  return list
    .map((item: any) => {
      const media = item?.node || item?.mediaRecommendation || item?.media || item;
      const id = media?.id;
      if (!id) return null;
      const title =
        media?.title?.english || media?.title?.romaji || media?.title?.native || media?.title || media?.name;
      const image = media?.coverImage?.large || media?.coverImage?.extraLarge || media?.image;
      const subtitle = item?.relationType || media?.format || media?.type || "";
      const score = media?.averageScore || media?.meanScore || 0;
      const format = media?.format || media?.type || "ANIME";
      return {
        id,
        title: title || "Untitled",
        subtitle: String(subtitle || ""),
        image: image || "/images/logo.svg",
        href: `/anime-details?id=${id}`,
        score,
        format,
      };
    })
    .filter(Boolean) as MediaCard[];
};

const JapaneseAnimeWatchPage = () => {
  const params = useSearchParams();
  const animeId = params.get("id") || "";
  const slug = params.get("slug") || "";
  const title = params.get("title") || "";
  const episode = Number(params.get("ep") || "1");
  const season = Number(params.get("season") || "1");
  const provider = params.get("provider") || "";
  const mode = params.get("mode") || "";
  const subType = params.get("subType") || "";
  const episodeId = params.get("episodeId") || "";
  const [loading, setLoading] = useState(true);
  const [watchData, setWatchData] = useState<any>(null);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<"sub" | "dub">("sub");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [refetchKey, setRefetchKey] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(String(provider || "").toLowerCase() || "kiwi");
  const [providerEpisodeLookup, setProviderEpisodeLookup] = useState<
    Record<string, { sub?: string; dub?: string }>
  >({});
  const [allyErrorFallbackUsed, setAllyErrorFallbackUsed] = useState(false);
  const [hasUserSelectedProvider, setHasUserSelectedProvider] = useState(false);

  const availableMiruroProviders = useMemo(() => {
    return Object.entries(providerEpisodeLookup)
      .filter(([providerName]) => !HIDDEN_PROVIDERS.has(String(providerName || "").toLowerCase()))
      .filter(([, value]: [string, any]) => Boolean(value?.sub || value?.dub))
      .map(([providerName]) => String(providerName || "").toLowerCase())
      .filter(Boolean);
  }, [providerEpisodeLookup]);

  useEffect(() => {
    const loadMeta = async () => {
      if (!animeId) {
        setAnimeInfo(null);
        setRecommendations([]);
        return;
      }
      try {
        const [infoPayload, recommendationsPayload] = await Promise.all([
          getMiruroInfo(animeId),
          getMiruroRecommendations(animeId),
        ]);
        setAnimeInfo(infoPayload);
        setRecommendations(recommendationsPayload?.recommendations?.slice(0, 5) || recommendationsPayload?.nodes?.slice(0, 5) || []);
      } catch (error) {
        console.error(error);
        setAnimeInfo(null);
        setRecommendations([]);
      }
    };
    loadMeta();
  }, [animeId]);

  useEffect(() => {
    setHasUserSelectedProvider(false);
  }, [animeId, slug, episode, provider]);

  useEffect(() => {
    const normalizedQueryProvider = String(provider || "").toLowerCase();
    const preferredDefault =
      availableMiruroProviders.includes("kiwi")
        ? "kiwi"
        : availableMiruroProviders.includes("ally")
          ? "ally"
          : availableMiruroProviders[0] || "";

    if (
      !hasUserSelectedProvider &&
      normalizedQueryProvider &&
      availableMiruroProviders.includes(normalizedQueryProvider)
    ) {
      if (selectedProvider !== normalizedQueryProvider) {
        setSelectedProvider(normalizedQueryProvider);
      }
      return;
    }

    const isExplicitAnikoto = selectedProvider === "anikoto";
    if (!isExplicitAnikoto && (!selectedProvider || !availableMiruroProviders.includes(selectedProvider))) {
      if (preferredDefault) {
        setSelectedProvider(preferredDefault);
      }
    }
  }, [provider, availableMiruroProviders, selectedProvider, hasUserSelectedProvider]);

  useEffect(() => {
    setAllyErrorFallbackUsed(false);
  }, [animeId, slug, title, episode, selectedType]);

  const isMiruroFlow = Boolean(animeId) && selectedProvider !== "anikoto";

  // For Miruro providers the available sub/dub options come from the episode
  // lookup (which episode IDs exist for this provider), NOT from the stream's
  // `audio` field — Miruro streams don't carry that field at all.
  const miruroAvailableTypes = useMemo((): ("sub" | "dub")[] => {
    const lookup = providerEpisodeLookup[selectedProvider] || {};
    const hasSub = Boolean(lookup.sub) || Boolean(deriveEpisodeIdForProvider(episodeId, selectedProvider, "sub"));
    const hasDub = Boolean(lookup.dub);
    const types: ("sub" | "dub")[] = [];
    if (hasSub) types.push("sub");
    if (hasDub) types.push("dub");
    return types.length > 0 ? types : ["sub"];
  }, [providerEpisodeLookup, selectedProvider, episodeId]);

  const [episodesPayload, setEpisodesPayload] = useState<any>(null);

  useEffect(() => {
    const loadEpisodes = async () => {
      if (!animeId) {
        setProviderEpisodeLookup({});
        setEpisodesPayload(null);
        return;
      }
      try {
        const payload = await getMiruroEpisodes(animeId);
        setEpisodesPayload(payload);
        setProviderEpisodeLookup(getEpisodeIdLookupForEpisode(payload, episode));
      } catch (error) {
        console.error(error);
        setProviderEpisodeLookup({});
        setEpisodesPayload(null);
      }
    };
    loadEpisodes();
  }, [animeId, episode]);

  useEffect(() => {
    const load = async () => {
      if (!slug && !title && !episodeId && !animeId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const normalizedProvider = String(selectedProvider || "").toLowerCase();
        let payload: any = null;
        if (isMiruroFlow) {
          // selectedType is captured via closure — this runs when refetchKey
          // changes (i.e. when user explicitly switches sub/dub for Miruro).
          const preferredFallback = ["kiwi", "ally"];
          const providerFallbackOrder = Array.from(
            new Set([
              normalizedProvider,
              ...preferredFallback.filter((name) => availableMiruroProviders.includes(name)),
              ...availableMiruroProviders,
            ]),
          ).filter(Boolean);
          for (const candidateProvider of providerFallbackOrder) {
            const lookupEpisodeId =
              providerEpisodeLookup?.[candidateProvider]?.[selectedType] ||
              providerEpisodeLookup?.[candidateProvider]?.sub ||
              providerEpisodeLookup?.[candidateProvider]?.dub ||
              deriveEpisodeIdForProvider(episodeId, candidateProvider, selectedType) ||
              (candidateProvider === String(provider || "").toLowerCase() ? episodeId : "");
            if (!lookupEpisodeId) continue;
            const miruroWatch = await getMiruroWatchByEpisodeId(lookupEpisodeId);
            const mappedSources = mapMiruroWatchToSources(miruroWatch, candidateProvider, selectedType);
            if (mappedSources.length === 0) continue;
            payload = {
              anime: { title },
              sources: mappedSources,
              providerPayload: miruroWatch,
            };
            if (candidateProvider !== normalizedProvider) {
              setSelectedProvider(candidateProvider);
            }
            break;
          }
          if (!payload) {
            payload = { anime: { title }, sources: [] };
          }
        } else {
          const res = slug
            ? await getAnikotoWatch(slug, episode)
            : await getAnikotoWatchByKeyword(title, episode);
          payload = res?.data || null;
        }

        setWatchData(payload);
        setSourceIndex(0);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
    // selectedType is intentionally omitted: for Anikoto it's pure filtering
    // (no re-fetch needed), and for Miruro the sub/dub switch is signalled via
    // refetchKey so we avoid an infinite-reset loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, title, episode, episodeId, provider, selectedProvider, providerEpisodeLookup, refetchKey, isMiruroFlow]);

  const sources = watchData?.sources || [];

  // Miruro: available types come from the episode lookup (streams have no audio field).
  // Anikoto: derive from the actual source types returned by the API.
  const anikotoSourceTypes: ("sub" | "dub")[] = Array.from(
    new Set(sources.map((s: any) => normalizeAudioType(s?.type)).filter(Boolean)),
  ) as ("sub" | "dub")[];
  const sourceTypes = isMiruroFlow ? miruroAvailableTypes : anikotoSourceTypes;
  const filteredSources = useMemo(
    () => sources.filter((source: any) => normalizeAudioType(source?.type) === selectedType),
    [sources, selectedType],
  );
  const selectedSource = filteredSources[sourceIndex] || null;
  const skipSegments = useMemo(
    () => extractSkipSegments([watchData, watchData?.providerPayload, selectedSource?.rawStream], selectedProvider, episode),
    [watchData, selectedSource, selectedProvider, episode],
  );

  useEffect(() => {
    setSourceIndex(0);
  }, [selectedType]);

  const captions = useMemo(() => {
    if (!selectedSource?.tracks) return [];
    return selectedSource.tracks.map((track: any) => ({
      label: track?.label || "Subtitle",
      file: track?.proxyUrl || track?.file,
      default: Boolean(track?.default),
    }));
  }, [selectedSource]);
  const animeName = useMemo(() => {
    const candidates = [
      title,
      animeInfo?.title?.english,
      animeInfo?.title?.romaji,
      animeInfo?.title?.native,
      watchData?.anime?.title,
      watchData?.anime?.name,
      watchData?.title,
      watchData?.name,
      watchData?.episode?.title,
    ];
    const firstFound = candidates.find((name) => typeof name === "string" && name.trim());
    if (firstFound) return firstFound;
    return (slug || title)
      .split("-")
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  }, [watchData, animeInfo, slug, title]);

  const backHref = animeId ? `/anime-details?id=${animeId}` : slug ? `/anime-detail?slug=${slug}` : "/anime";
  const providerMeta = [selectedProvider, mode, subType].filter(Boolean).join(" • ");
  const providerOptions = useMemo(() => {
    const list = [...availableMiruroProviders];
    if (!list.includes("anikoto")) {
      list.push("anikoto");
    }
    return list;
  }, [availableMiruroProviders, selectedProvider]);
  const onPlaybackError = (message: string) => {
    if (
      String(selectedProvider || "").toLowerCase() === "ally" &&
      String(message || "").toLowerCase().includes("video load error") &&
      !allyErrorFallbackUsed
    ) {
      setAllyErrorFallbackUsed(true);
      setSelectedProvider("anikoto");
      setSourceIndex(0);
      setRefetchKey((k) => k + 1);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <section className={styles.playerSection}>
              {loading ? <p className={styles.empty}>Loading watch sources...</p> : null}
              {!loading && !selectedSource?.proxyUrl ? (
                <p className={styles.empty}>No source found for this episode.</p>
              ) : null}
              {!loading && selectedSource?.proxyUrl ? (
                <div className={styles.playerWrap}>
                  {selectedProvider === "kiwi" ? (
                    <VidstackPlayer
                      key={`${selectedType}-${sourceIndex}-${selectedSource?.server}-${selectedSource?.proxyUrl}`}
                      url={selectedSource.proxyUrl}
                      captions={captions}
                      skipSegments={skipSegments}
                      className={styles.player}
                    />
                  ) : (
                    <Player
                      key={`${selectedType}-${sourceIndex}-${selectedSource?.server}-${selectedSource?.proxyUrl}`}
                      option={{ url: selectedSource.proxyUrl }}
                      format={selectedSource?.streamFormat || "hls"}
                      captions={captions}
                      skipSegments={skipSegments}
                      onPlaybackError={onPlaybackError}
                      className={styles.player}
                    />
                  )}
                </div>
              ) : null}
            </section>

            <WatchHeader
              animeName={animeName || "Anime"}
              season={season}
              episode={episode}
              providerMeta={providerMeta}
              backHref={backHref}
              providerOptions={providerOptions}
              selectedProvider={selectedProvider}
              onProviderChange={(value) => {
                setHasUserSelectedProvider(true);
                setSelectedProvider(value);
                setSourceIndex(0);
              }}
              sourceTypes={sourceTypes}
              selectedType={selectedType}
              onTypeChange={(next) => {
                setSelectedType(next);
                setSourceIndex(0);
                if (isMiruroFlow) setRefetchKey((k) => k + 1);
              }}
            />

            <WatchSourceList
              sources={filteredSources}
              selectedIndex={sourceIndex}
              onSelect={(idx) => setSourceIndex(idx)}
            />

            <WatchInfoPanel info={animeInfo} title={animeName || title || "Anime"} />
            <WatchCommentsPanel
              malId={animeInfo?.malId || animeInfo?.idMal}
              aniListId={animeInfo?.id || animeId}
              episode={episode}
            />
          </div>
        </main>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <WatchEpisodeList
              animeId={animeId}
              title={animeName || title}
              episodesPayload={episodesPayload}
              currentEpisode={episode}
              selectedProvider={selectedProvider}
              selectedType={selectedType}
            />
            <WatchMediaRail
              title="Recommended"
              items={recommendations}
              emptyText="No recommendations found."
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default JapaneseAnimeWatchPage;
