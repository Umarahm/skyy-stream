import Link from "next/link";
import styles from "./style.module.scss";

type WatchHeaderProps = {
  animeName: string;
  season: number;
  episode: number;
  providerMeta: string;
  backHref: string;
  providerOptions: string[];
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  sourceTypes: ("sub" | "dub")[];
  selectedType: "sub" | "dub";
  onTypeChange: (type: "sub" | "dub") => void;
};

const WatchHeader = ({
  animeName,
  season,
  episode,
  providerMeta,
  backHref,
  providerOptions,
  selectedProvider,
  onProviderChange,
  sourceTypes,
  selectedType,
  onTypeChange,
}: WatchHeaderProps) => {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.headingTitle}>{animeName || "Anime"}</h1>
        <p className={styles.headingMeta}>
          Season {season} • Episode {episode}
        </p>
        {providerMeta ? <p className={styles.headingMeta}>{providerMeta}</p> : null}
      </div>
      <div className={styles.controls}>
        <Link href={backHref} className="btn">
          Back to Detail
        </Link>
        {providerOptions.length > 0 ? (
          <select value={selectedProvider} onChange={(e) => onProviderChange(e.target.value)}>
            {providerOptions.map((providerOption) => (
              <option key={providerOption} value={providerOption}>
                {providerOption.toUpperCase()}
              </option>
            ))}
          </select>
        ) : null}
        {sourceTypes.length > 0 ? (
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as "sub" | "dub")}
          >
            {sourceTypes.includes("sub") ? <option value="sub">SUB Sources</option> : null}
            {sourceTypes.includes("dub") ? <option value="dub">DUB Sources</option> : null}
          </select>
        ) : null}
      </div>
    </header>
  );
};

export default WatchHeader;
