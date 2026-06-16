import { useEffect, useRef } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

// #region agent log
const __dbgCounts: Record<string, number> = {};
const __dbg = (location: string, message: string, data: any, hypothesisId: string) => {
  const key = location + "|" + message + "|" + (data?.sn ?? "");
  __dbgCounts[key] = (__dbgCounts[key] || 0) + 1;
  if (__dbgCounts[key] > 40) return;
  const payload = { sessionId: 'be2b7d', hypothesisId, location, message, data: { ...data, n: __dbgCounts[key] }, timestamp: Date.now() };
  // Console is the reliable transport here (the cross-origin ingest POST is
  // blocked, returning 400, so the NDJSON file never gets written).
  console.log('[DBG hyp=' + hypothesisId + ']', message, JSON.stringify(payload.data));
};
// #endregion

// Some HLS sources (e.g. kwik.cx / animepahe) label their AAC audio as
// `mp4a.40.1` (AAC Main), a profile browsers reject in Media Source Extensions
// even though the underlying audio decodes fine as `mp4a.40.2` (AAC-LC).
// Without this remap, `addSourceBuffer` throws NotSupportedError, the audio
// SourceBuffer is never created, every segment append fails, and hls.js/vidstack
// retry the same segment forever — hammering the proxy. Remapping the codec
// string lets the audio buffer be created so playback proceeds normally.
const remapUnsupportedAudioCodec = (type: unknown) =>
  typeof type === "string" ? type.replace(/mp4a\.40\.1\b/gi, "mp4a.40.2") : type;

let __aacCodecPatched = false;
const patchMediaSourceAudioCodec = () => {
  if (__aacCodecPatched || typeof window === "undefined") return;
  __aacCodecPatched = true;

  const sources: any[] = [
    (window as any).MediaSource,
    (window as any).ManagedMediaSource,
    (window as any).WebKitMediaSource,
  ].filter(Boolean);

  for (const MS of sources) {
    if (MS.__riveAacPatched) continue;

    if (typeof MS.isTypeSupported === "function") {
      const origIsTypeSupported = MS.isTypeSupported.bind(MS);
      MS.isTypeSupported = (type: string) => origIsTypeSupported(remapUnsupportedAudioCodec(type) as string);
    }

    const proto = MS.prototype;
    if (proto && typeof proto.addSourceBuffer === "function") {
      const origAddSourceBuffer = proto.addSourceBuffer;
      proto.addSourceBuffer = function (type: string) {
        const remapped = remapUnsupportedAudioCodec(type) as string;
        // #region agent log
        if (remapped !== type) {
          __dbg("VidstackPlayer/index.tsx:addSourceBuffer", "remapped audio codec", { from: type, to: remapped }, "post-fix");
        }
        // #endregion
        return origAddSourceBuffer.call(this, remapped);
      };
    }

    MS.__riveAacPatched = true;
  }
};

interface Caption {
  label: string;
  file: string;
  default?: boolean;
}

interface VidstackPlayerProps {
  url: string;
  captions?: Caption[];
  skipSegments?: Array<{
    start: number;
    end: number;
    type: "opening" | "closing" | "recap";
    label: string;
  }>;
  className?: string;
}

export default function VidstackPlayer({
  url,
  captions = [],
  skipSegments = [],
  className,
}: VidstackPlayerProps) {
  const player = useRef<MediaPlayerInstance>(null);

  // Patch the unsupported AAC codec before any MediaSource is created.
  patchMediaSourceAudioCodec();

  // #region agent log
  // H-G: does the fetch transport work at all + does the component mount with a url?
  useEffect(() => {
    __dbg("VidstackPlayer/index.tsx:mount", "VidstackPlayer mounted", { hasUrl: Boolean(url), urlTail: String(url || "").slice(-50) }, "G");
  }, [url]);
  // #endregion

  const sanitizeRequestUrl = (requestUrl: string) => {
    let nextUrl = requestUrl;

    if (
      nextUrl.startsWith("http://") &&
      typeof window !== "undefined" &&
      window.location.protocol === "https:"
    ) {
      nextUrl = nextUrl.replace(/^http:\/\//, "https://");
    }

    try {
      const parsed = new URL(nextUrl);
      const nestedUrl = parsed.searchParams.get("url");
      if (nestedUrl?.startsWith("http://")) {
        parsed.searchParams.set("url", nestedUrl.replace(/^http:\/\//, "https://"));
        nextUrl = parsed.toString();
      }
    } catch (_) {
      // Fallback for non-URL-safe inputs.
      if (nextUrl.includes("url=http://")) {
        nextUrl = nextUrl.replace(/url=http:\/\//g, "url=https://");
      }
      if (nextUrl.includes("url=http%3A%2F%2F")) {
        nextUrl = nextUrl.replace(/url=http%3A%2F%2F/g, "url=https%3A%2F%2F");
      }
    }

    return nextUrl;
  };

  // After hls.js is instantiated by Vidstack, inject stable request handling.
  const handleHlsInstance = (hls: any) => {
    if (!hls?.config) return;

    // Ensure the AAC codec remap is active before hls.js creates source buffers.
    patchMediaSourceAudioCodec();

    // Keep retries conservative to protect the proxy from request storms.
    hls.config.fragLoadingMaxRetry = 0;
    hls.config.keyLoadingMaxRetry = 0;
    hls.config.levelLoadingMaxRetry = 1;
    hls.config.manifestLoadingMaxRetry = 1;
    hls.config.fragLoadingRetryDelay = 0;
    hls.config.levelLoadingRetryDelay = 250;
    hls.config.manifestLoadingRetryDelay = 250;
    // Cap the buffer-stall nudge loop — this is the separate mechanism that
    // drives "same segment called again and again" independently of fragLoadingMaxRetry.
    hls.config.nudgeMaxRetry = 1;

    // #region agent log
    // H-E: confirm our config actually sticks after vidstack initialises hls.
    __dbg("VidstackPlayer/index.tsx:config", "hls config applied", {
      fragLoadingMaxRetry: hls.config.fragLoadingMaxRetry,
      nudgeMaxRetry: hls.config.nudgeMaxRetry,
      appendErrorMaxRetry: hls.config.appendErrorMaxRetry,
    }, "E");
    // #endregion

    hls.config.xhrSetup = (xhr: XMLHttpRequest, requestUrl: string) => {
      const newUrl = sanitizeRequestUrl(requestUrl);

      if (newUrl !== requestUrl) {
        const rt = xhr.responseType;
        const to = xhr.timeout;
        const wc = xhr.withCredentials;
        xhr.open("GET", newUrl, true);
        xhr.responseType = rt;
        xhr.timeout = to;
        xhr.withCredentials = wc;
      }
    };

    // #region agent log
    // H-J: does ANY fragment ever successfully buffer, or does the first
    // (init) append always fail? Track loads vs buffered.
    hls.on("hlsFragLoaded", (_e: any, d: any) => {
      __dbg("VidstackPlayer/index.tsx:FRAG_LOADED", "frag loaded", { sn: d?.frag?.sn, level: d?.frag?.level, bytes: d?.payload?.byteLength ?? d?.frag?.stats?.total }, "J");
    });
    hls.on("hlsFragBuffered", (_e: any, d: any) => {
      __dbg("VidstackPlayer/index.tsx:FRAG_BUFFERED", "frag buffered", { sn: d?.frag?.sn, level: d?.frag?.level }, "J");
    });
    // #endregion

    let recoverCount = 0;
    hls.on("hlsError", (_evt: any, data: any) => {
      // #region agent log
      // H-H: capture the EXACT append exception (name/message) + context.
      const err = data?.error || data?.err;
      __dbg("VidstackPlayer/index.tsx:hlsError", "hls error", {
        details: String(data?.details || ""),
        type: String(data?.type || ""),
        fatal: Boolean(data?.fatal),
        parent: String(data?.parent || ""),
        sn: data?.frag?.sn,
        errName: err?.name,
        errMessage: String(err?.message || "").slice(0, 200),
        mimeType: data?.mimeType,
      }, "H");
      // #endregion

      // For fatal errors use hls.js built-in recovery — never detachMedia()
      // because that severs the video element and breaks all further loading.
      if (data.fatal) {
        if (data.type === "mediaError") {
          recoverCount += 1;
          // #region agent log
          // H-I: how many times does media-error recovery fire (loop driver)?
          __dbg("VidstackPlayer/index.tsx:recoverMediaError", "calling recoverMediaError", { recoverCount, details: String(data?.details || "") }, "I");
          // #endregion
          hls.recoverMediaError?.();
        } else if (data.type === "networkError") {
          // #region agent log
          __dbg("VidstackPlayer/index.tsx:startLoad", "calling startLoad", { details: String(data?.details || "") }, "I");
          // #endregion
          hls.startLoad?.();
        }
        return;
      }
    });
  };

  // Proxy URLs don't end in .m3u8 so we must provide a type hint,
  // otherwise Vidstack can't detect the HLS source type.
  const src = url
    ? { src: sanitizeRequestUrl(url), type: "application/x-mpegurl" as const }
    : undefined;

  useEffect(() => {
    if (!player.current || !Array.isArray(skipSegments) || skipSegments.length === 0) return;
    const skippedRanges = new Set<string>();
    const timer = window.setInterval(() => {
      const instance = player.current;
      if (!instance) return;
      const now = Number((instance as any).currentTime ?? 0);
      if (!Number.isFinite(now)) return;
      const activeSegment = skipSegments.find((segment) => {
        const start = Number(segment?.start);
        const end = Number(segment?.end);
        return Number.isFinite(start) && Number.isFinite(end) && end > start && now >= start && now < end;
      });
      if (!activeSegment) return;
      const key = `${activeSegment.type}-${activeSegment.start}-${activeSegment.end}`;
      if (skippedRanges.has(key)) return;
      skippedRanges.add(key);
      (instance as any).currentTime = Number(activeSegment.end);
    }, 350);
    return () => window.clearInterval(timer);
  }, [skipSegments, url]);

  return (
    <MediaPlayer
      ref={player}
      src={src}
      autoPlay
      playsInline
      crossOrigin
      className={[className, "rive-vidstack-player"].filter(Boolean).join(" ")}
      onHlsInstance={handleHlsInstance}
      style={{ width: "100%", height: "100%" }}
    >
      <MediaProvider>
        {captions.map((caption, i) => (
          <Track
            key={`${caption.label}-${i}`}
            src={caption.file}
            kind="captions"
            label={caption.label}
            default={caption.default}
          />
        ))}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} colorScheme="dark" />
    </MediaPlayer>
  );
}
