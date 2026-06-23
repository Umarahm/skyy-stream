import React from "react";
import styles from "./style.module.scss";
import { GrAnnounce } from "react-icons/gr";

type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.0",
    date: "June 24, 2026",
    title: "Rive 3.0 — Rive Sports",
    highlights: [
      "Brand new Rive Sports hub, alongside Movies/TV and Anime & Manga, with its own logo and a movie/TV-style hero carousel that always spells out whether a match is live, upcoming, or final — with kickoff times shown in your own local time.",
      "Homepage rails for Live Now (streamed.pk), Live & Upcoming across football, cricket, basketball, baseball and hockey, FIFA World Cup news, and Football/Cricket league browsing.",
      "Live football scores now poll automatically and show who scored and when directly on the homepage's Live Now cards, with a Watch Live button that reconciles fixtures against streamed.pk automatically.",
      "A curated, toggleable FIFA World Cup section with its own Schedule (grouped by day, winners highlighted), Standings (all groups, top team highlighted), News, and Highlights pages.",
      "FIFA news articles now open and read fully inside Rive instead of bouncing out to ESPN.",
      "Match detail pages for finished football and cricket games, with team stats comparisons, a key-events timeline, and a true pitch graphic showing real formations, player positions, goals, and cards.",
      "All Leagues browsing for football (Premier League, La Liga, Bundesliga, Serie A, Champions League) and cricket (IPL, Big Bash, Major League Cricket), each with its own fixtures and standings page.",
      "Live page with a streamed.pk-style sport-pill filter row and Popular/Live Now rails.",
    ],
  },
  {
    version: "2.0",
    date: "June 17, 2026",
    title: "Rive 2.0 — Japanese Hub & Streaming",
    highlights: [
      "Highly requested anime schedule bug is fixed and now you can see the full schedule of anime airing in the next coming days.",
      "New Japanese hub with dedicated anime and manga browsing, search, and watch flows.",
      "Anime detail pages now use AniList for episode counts, with filler episodes highlighted in the list.",
      "Inline episode preview on anime detail — play directly from the detail page with sub/dub, source, and server selectors.",
      "Provider check modal tries multiple sources automatically and picks the first working stream.",
      "Characters tab on anime detail, powered by the Miruro characters endpoint.",
      "Vidstack player integration for a smoother watch experience on anime pages.",
      "Weekly anime schedule page with multi-page data loading for a fuller airing list.",
      "Detail meta panel refreshed to match the movie/TV layout, with a dedicated Episodes block.",
      "AniList rating badge on anime posters and improved dub/sub source detection across providers.",
      "Navbar updates: quick links to schedule and this announcements page from both hubs.",
    ],
  },
];

const AnnouncementsPage = () => {
  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <img src="/images/logo.svg" alt="Rive logo" />
        <p>Your Personal Streaming Oasis</p>
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <GrAnnounce className={styles.headerIcon} />
          <div>
            <h1>Announcements</h1>
            <p>What&apos;s new in Rive</p>
          </div>
        </div>

        {CHANGELOG.map((entry) => (
          <article key={entry.version} className={styles.entry}>
            <div className={styles.entryMeta}>
              <span className={styles.version}>v {entry.version}</span>
              <span className={styles.date}>{entry.date}</span>
            </div>
            <h2>{entry.title}</h2>
            <ul>
              {entry.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
