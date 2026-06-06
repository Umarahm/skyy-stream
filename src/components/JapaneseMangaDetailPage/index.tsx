import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./style.module.scss";

const JapaneseMangaDetailPage = () => {
  const params = useSearchParams();
  const [title, setTitle] = useState("Manga");
  const id = params.get("id");

  useEffect(() => {
    const qTitle = params.get("title");
    if (qTitle) setTitle(qTitle);
  }, [params]);

  const weebcentralQuery = encodeURIComponent(title);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <img src={"/images/logo.svg"} />
        <div className={styles.overlay}>
          <h1>{title}</h1>
          <p>
            Open this title on WeebCentral. If you have a better title match, search manually by
            editing the query.
          </p>
          <a
            href={`https://weebcentral.com/search?q=${weebcentralQuery}`}
            target="_blank"
            rel="noreferrer"
            className="btn"
          >
            Continue on WeebCentral
          </a>
        </div>
      </div>
      <div className={styles.meta}>
        <p>Manga ID: {id || "Unknown"}</p>
        <p>Provider: WeebCentral</p>
      </div>
    </div>
  );
};

export default JapaneseMangaDetailPage;
