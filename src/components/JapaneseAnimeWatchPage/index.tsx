import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./style.module.scss";
import Link from "next/link";
import Player from "@/components/Artplayer";
import { getAnikotoWatch, getAnikotoWatchByKeyword } from "@/Utils/anikoto";
import { getMiruroEpisodes, getMiruroWatchByEpisodeId } from "@/Utils/miruro";

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
      .replace("{url}", streamUrl)
      .replace("{ref}", normalizedRef);
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
  return `${cleanBase}/fetch?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(referer)}`;
};

const mapMiruroWatchToSources = (payload: any, provider: string, audioType: "sub" | "dub") => {
  const providerName = String(provider || "").toLowerCase();
  const streams = Array.isArray(payload?.streams) ? payload.streams : [];
  let usableStreams = streams.filter((item: any) => {
    const streamType = String(item?.type || "").toLowerCase();
    return Boolean(item?.url) && (streamType === "hls" || streamType === "mp4");
  });

  if (providerName === "kiwi") {
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
      tracks: [],
      rawStream: stream,
      idx,
    });
  });

  return sources;
};

const SUPPORTED_PROVIDER_OPTIONS = ["kiwi", "ally", "moo", "anikoto"];

const getEpisodeIdLookupForEpisode = (episodesPayload: any, episodeNo: number) => {
  const providers = episodesPayload?.providers || {};
  const lookup: Record<string, { sub?: string; dub?: string }> = {};
  Object.entries(providers).forEach(([providerName, providerDataRaw]: [string, any]) => {
    const provider = String(providerName || "").toLowerCase();
    if (!SUPPORTED_PROVIDER_OPTIONS.includes(provider) || provider === "anikoto") return;
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
  const [selectedType, setSelectedType] = useState<"sub" | "dub">("sub");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [refetchKey, setRefetchKey] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(
    SUPPORTED_PROVIDER_OPTIONS.includes(String(provider || "").toLowerCase())
      ? String(provider || "").toLowerCase()
      : "kiwi",
  );
  const [providerEpisodeLookup, setProviderEpisodeLookup] = useState<
    Record<string, { sub?: string; dub?: string }>
  >({});

  useEffect(() => {
    const normalizedProvider = String(provider || "").toLowerCase();
    if (SUPPORTED_PROVIDER_OPTIONS.includes(normalizedProvider)) {
      setSelectedProvider(normalizedProvider);
    }
  }, [provider]);

  const isMiruroFlow = ["kiwi", "moo", "ally"].includes(selectedProvider);

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

  useEffect(() => {
    const loadEpisodes = async () => {
      if (!animeId) {
        setProviderEpisodeLookup({});
        return;
      }
      try {
        const payload = await getMiruroEpisodes(animeId);
        setProviderEpisodeLookup(getEpisodeIdLookupForEpisode(payload, episode));
      } catch (error) {
        console.error(error);
        setProviderEpisodeLookup({});
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
          const lookupEpisodeId =
            providerEpisodeLookup?.[normalizedProvider]?.[selectedType] ||
            providerEpisodeLookup?.[normalizedProvider]?.sub ||
            providerEpisodeLookup?.[normalizedProvider]?.dub ||
            deriveEpisodeIdForProvider(episodeId, normalizedProvider, selectedType) ||
            (normalizedProvider === String(provider || "").toLowerCase() ? episodeId : "");
          if (!lookupEpisodeId) {
            payload = { anime: { title }, sources: [] };
          } else {
            const miruroWatch = await getMiruroWatchByEpisodeId(lookupEpisodeId);
            const mappedSources = mapMiruroWatchToSources(miruroWatch, normalizedProvider, selectedType);
            payload = {
              anime: { title },
              sources: mappedSources,
              providerPayload: miruroWatch,
            };
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
  }, [watchData, slug, title]);

  const backHref = animeId ? `/anime-details?id=${animeId}` : slug ? `/anime-detail?slug=${slug}` : "/anime";
  const providerMeta = [selectedProvider, mode, subType].filter(Boolean).join(" • ");

  return (
    <div className={styles.page}>
      <h1 className={styles.headingTitle}>{animeName || "Anime"}</h1>
      <p className={styles.headingMeta}>
        Season {season} • Episode {episode}
      </p>
      {providerMeta ? <p className={styles.headingMeta}>{providerMeta}</p> : null}
      <div className={styles.controls}>
        <Link href={backHref} className="btn">
          Back to Detail
        </Link>
        <select
          value={selectedProvider}
          onChange={(e) => {
            setSelectedProvider(e.target.value);
            setSourceIndex(0);
          }}
        >
          {SUPPORTED_PROVIDER_OPTIONS.map((providerOption) => (
            <option key={providerOption} value={providerOption}>
              {providerOption.toUpperCase()}
            </option>
          ))}
        </select>
        {sourceTypes.length > 0 ? (
          <select
            value={selectedType}
            onChange={(e) => {
              const next = e.target.value as "sub" | "dub";
              setSelectedType(next);
              setSourceIndex(0);
              // For Miruro, sub/dub maps to a different episode ID — trigger re-fetch.
              if (isMiruroFlow) setRefetchKey((k) => k + 1);
            }}
          >
            {sourceTypes.includes("sub") ? <option value="sub">SUB Sources</option> : null}
            {sourceTypes.includes("dub") ? <option value="dub">DUB Sources</option> : null}
          </select>
        ) : null}
        {filteredSources.length > 0 ? (
          <select
            value={sourceIndex}
            onChange={(e) => setSourceIndex(Number(e.target.value))}
          >
            {filteredSources.map((source: any, idx: number) => (
              <option key={`${source?.server}-${source?.type}-${idx}`} value={idx}>
                {source?.server} ({normalizeAudioType(source?.type) || "sub"})
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {loading ? <p className={styles.empty}>Loading watch sources...</p> : null}
      {!loading && !selectedSource?.proxyUrl ? (
        <p className={styles.empty}>No source found for this episode.</p>
      ) : null}
      {!loading && selectedSource?.proxyUrl ? (
        <div className={styles.playerWrap}>
          <Player
            key={`${selectedType}-${sourceIndex}-${selectedSource?.server}-${selectedSource?.proxyUrl}`}
            option={{ url: selectedSource.proxyUrl }}
            format={selectedSource?.streamFormat || "hls"}
            captions={captions}
            className={styles.player}
          />
        </div>
      ) : null}
    </div>
  );
};

export default JapaneseAnimeWatchPage;
