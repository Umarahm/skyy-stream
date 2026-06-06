import { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import artplayerPluginHlsQuality from "artplayer-plugin-hls-quality";
import Hls from "hls.js";

function destroyHls(hls: any) {
  if (!hls) return;
  try {
    hls.stopLoad?.();
    hls.detachMedia?.();
    hls.destroy?.();
  } catch (_) {}
}

export default function Player({
  option,
  captions,
  getInstance,
  format,
  ...rest
}: any) {
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!artRef.current) return;

    // ── Abort flag ──────────────────────────────────────────────────────────
    // If cleanup runs before playM3u8 is called (React StrictMode double-invoke
    // or fast re-render), the flag prevents the stale callback from ever
    // creating an HLS instance.
    let aborted = false;

    // Track the HLS instance created inside this effect run so cleanup can
    // always reach it, even if art.hls hasn't been set yet.
    let hlsInstance: any = null;

    // Wipe the container so no ghost DOM from a previous player survives.
    artRef.current.innerHTML = "";

    // ── HLS custom-type handler ─────────────────────────────────────────────
    function playM3u8(video: HTMLVideoElement, url: string, art: any) {
      if (aborted) return; // stale — ignore entirely

      if (Hls.isSupported()) {
        // Kill any previous HLS inside this effect run before starting a new one
        destroyHls(hlsInstance);
        hlsInstance = null;

        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        art.hls = hls;
        hlsInstance = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        art.notice.show = "Unsupported playback format: m3u8";
      }
    }

    // ── Subtitle / caption setup ────────────────────────────────────────────
    const defaultCaption =
      captions?.find((c: any) => c?.default) ||
      captions?.find((c: any) =>
        String(c?.label || "").toLowerCase().includes("english"),
      ) ||
      captions?.[0];

    const subtitles =
      captions?.length > 0
        ? captions.map((ele: any) => ({
            default: Boolean(ele?.default),
            html: ele?.label,
            url: ele?.file,
          }))
        : [{ html: "No Captions", url: "" }];

    // ── Create player ───────────────────────────────────────────────────────
    Artplayer.MOBILE_CLICK_PLAY = true;

    const art = new Artplayer({
      ...option,
      container: artRef.current,
      setting: true,
      fullscreen: true,
      autoOrientation: true,
      flip: true,
      pip: true,
      playbackRate: true,
      aspectRatio: true,
      type: format === "hls" ? "m3u8" : "mp4",
      subtitle: {
        url: defaultCaption?.file || "",
        // Proxy URLs don't end in .vtt so Artplayer can't auto-detect the
        // format — force it to always treat captions as WebVTT.
        type: "vtt",
        encoding: "utf-8",
        // Allow <b>, <i>, <u>, <ruby> etc. inside VTT cues to render as real
        // HTML rather than being escaped to plain text.
        escape: false,
      },
      airplay: true,
      mutex: true,
      subtitleOffset: true,
      miniProgressBar: true,
      autoplay: true,
      hotkey: true,
      screenshot: true,
      customType: format === "hls" ? { m3u8: playM3u8 } : {},
      settings: [
        {
          html: "Subtitle",
          width: 250,
          tooltip: "",
          selector: subtitles,
          onSelect(item: any) {
            if (item?.url) {
              // Use switch() so we can force type: 'vtt' — proxy URLs have no
              // .vtt extension and Artplayer can't auto-detect the format.
              art.subtitle.switch(item.url, { name: item.html, type: "vtt" });
            } else {
              art.subtitle.url = "";
            }
            return item?.html;
          },
        },
        {
          html: "Watch Party",
          width: 250,
          height: 500,
          icon: '<img src="/images/logo512.svg" alt="watchparty"/>',
          selector: [
            {
              html: "watchparty.me",
              url: "https://www.watchparty.me/create?video=" + option?.url,
            },
          ],
          onSelect() {
            const a = document.createElement("a");
            a.href = `https://www.watchparty.me/create?video=${option.url}`;
            a.target = "_blank";
            a.dispatchEvent(
              new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
            );
          },
        },
        {
          html: "Download",
          width: 250,
          height: 500,
          icon: '<img src="/images/logo512.svg" alt="download"/>',
          selector:
            format === "hls"
              ? [
                  { html: "Download HLS (Recommended)", url: option.url, opt: 1 },
                  { html: "Download HLS (mediatools)", url: option.url, opt: 2 },
                  { html: "Download HLS (thetuhin)", url: option.url, opt: 3 },
                ]
              : [{ html: "Download mp4", url: option.url, opt: 4 }],
          onSelect(item: any) {
            const open = (url: string) => {
              const a = document.createElement("a");
              a.href = url;
              a.target = "_blank";
              a.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
              );
            };
            if (item.opt === 1) open(`https://hlsdownload.vidbinge.com/?url=${option.url}`);
            if (item.opt === 2) open(`https://mediatools.cc/hlsDownloader?query=${option.url}`);
            if (item.opt === 3) {
              navigator?.clipboard?.writeText(option.url);
              open(`https://hlsdownloader.thetuhin.com/?text=${option.url}`);
            }
            if (item.opt === 4) {
              navigator?.clipboard?.writeText(option.url);
              open(option.url);
            }
          },
        },
      ],
      plugins:
        format === "hls"
          ? [
              artplayerPluginHlsQuality({
                setting: true,
                getResolution: (level: any) => level.height + "P",
                title: "Quality",
                auto: "Auto",
              }),
            ]
          : [],
    });

    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    art.on("ready", () => {
      art.notice.show = "Video Ready To Play";
    });
    art.on("error", (error: any, reconnectTime: any) => {
      art.notice.show = "Video Load Error";
      console.info(error, reconnectTime);
    });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      // Mark this effect run as dead — any pending playM3u8 call is now a no-op
      aborted = true;

      // Destroy the HLS instance we know about (may have been set before art.hls)
      destroyHls(hlsInstance);
      hlsInstance = null;

      // Also destroy whatever Artplayer may have stored separately
      if (art.hls && art.hls !== hlsInstance) {
        destroyHls(art.hls);
        art.hls = null;
      }

      // Hard-stop the underlying video element
      try {
        const video = art.video as HTMLVideoElement | undefined;
        if (video) {
          video.pause();
          video.removeAttribute("src");
          video.load();
        }
      } catch (_) {}

      // Destroy the Artplayer instance
      try {
        art.destroy(true);
      } catch (_) {}

      // Wipe container DOM
      if (artRef.current) {
        artRef.current.innerHTML = "";
      }
    };
  }, [option.url, format, captions]);

  return <div ref={artRef} {...rest}></div>;
}
