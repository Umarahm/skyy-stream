import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./style.module.scss";
import { EVENTS_CONFIG } from "@/Utils/sportsEvents";

const TABS = [
  { href: "/sports-fifa-schedule", label: "Schedule" },
  { href: "/sports-fifa-standings", label: "Standings" },
  { href: "/sports-fifa-news", label: "News" },
  { href: "/sports-fifa-highlights", label: "Highlights" },
];

const FifaSubNav = () => {
  const pathname = usePathname();
  const fifa = EVENTS_CONFIG.fifaWorldCup;

  return (
    <div className={styles.fifaNav}>
      <img src={fifa.logo} alt={fifa.label} className={styles.fifaNavLogo} />
      <span className={styles.fifaNavLabel}>{fifa.label}</span>
      <div className={styles.fifaTabs}>
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.fifaTabPill} ${pathname === tab.href ? styles.active : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FifaSubNav;
