import styles from "./style.module.scss";

type WatchInfoPanelProps = {
  info: any;
  title: string;
};

const cleanDescription = (value: string) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

const WatchInfoPanel = ({ info, title }: WatchInfoPanelProps) => {
  const displayTitle =
    info?.title?.english ||
    info?.title?.romaji ||
    info?.title?.native ||
    info?.name ||
    title;
  const poster =
    info?.coverImage?.extraLarge ||
    info?.coverImage?.large ||
    info?.image ||
    "/images/logo.svg";
  const synopsis = cleanDescription(info?.description || info?.synopsis || "");
  const status = info?.status || info?.state || "-";
  const format = info?.format || info?.type || "ANIME";
  const episodes = info?.episodes || "-";
  const malId = info?.malId || "-";

  return (
    <section className={styles.infoPanel}>
      <h3>Info</h3>
      <div className={styles.infoContent}>
        <img
          src={poster}
          alt={displayTitle || "Anime poster"}
          className={styles.infoPoster}
        />
        <div className={styles.infoText}>
          <h4>{displayTitle || "Anime"}</h4>
          {synopsis ? <p className={styles.infoSynopsis}>{synopsis}</p> : null}
          <div className={styles.infoGrid}>
            <span>Format: {format}</span>
            <span>Status: {status}</span>
            <span>Episodes: {episodes}</span>
            <span>MAL ID: {malId}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WatchInfoPanel;
