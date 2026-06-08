import React, { useEffect, useState, useMemo } from "react";
import styles from "./style.module.scss";
import Link from "next/link";
import { MdOutlineCalendarToday, MdArrowForward, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { getMiruroSchedule } from "@/Utils/miruro";

const AnimeSchedule = () => {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const json = await getMiruroSchedule();
        if (json?.results) {
          setScheduleData(json.results);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const todaysSchedule = useMemo(() => {
    const today = new Date();
    return scheduleData
      .filter((item) => {
        const airingDate = new Date(item.airingAt * 1000);
        return isSameDay(airingDate, today);
      })
      .sort((a, b) => a.airingAt - b.airingAt);
  }, [scheduleData]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  const getDetailHref = (item: any) => {
    const id = item?.id || item?.aniId || item?.malId;
    return id ? `/anime-details?id=${id}` : "/anime";
  };

  const sliderRef = React.useRef<HTMLDivElement>(null);

  const scrollSlider = (dir: "left" | "right") => {
    if (sliderRef.current) {
      const scrollAmount = 300;
      sliderRef.current.scrollBy({
        left: dir === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={styles.todayScheduleContainer}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <MdOutlineCalendarToday className={styles.icon} />
          <h2>TODAY'S SCHEDULE</h2>
        </div>
        <Link href="/schedule" className={styles.viewAll}>
          View All <MdArrowForward />
        </Link>
      </div>

      <div className={styles.sliderWrapper}>
        <button className={`${styles.navBtn} ${styles.left}`} onClick={() => scrollSlider("left")}>
          <MdChevronLeft />
        </button>
        <div className={styles.slider} ref={sliderRef}>
          {loading ? (
            <p className={styles.message}>Loading...</p>
          ) : todaysSchedule.length > 0 ? (
            todaysSchedule.map((item, idx) => {
              const image =
                item.coverImage?.extraLarge ||
                item.coverImage?.large ||
                item.bannerImage ||
                "/images/logo.svg";

              return (
                <Link key={idx} href={getDetailHref(item)} className={styles.card}>
                  <div className={styles.timePill}>{formatTime(item.airingAt)}</div>
                  <div className={styles.posterWrap}>
                    <div
                      className={styles.poster}
                      style={{ backgroundImage: `url(${image})` }}
                    ></div>
                    <div className={styles.episodeBadge}>E{item.next_episode}</div>
                  </div>
                  <div className={styles.info}>
                    <h3 className={styles.animeTitle} title={item.title?.english || item.title?.romaji}>
                      {item.title?.english || item.title?.romaji}
                    </h3>
                    <p className={styles.meta}>
                      {item.format} · {item.seasonYear}
                    </p>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className={styles.message}>No anime scheduled for today.</p>
          )}
          
          {!loading && todaysSchedule.length > 0 && (
            <Link href="/schedule" className={styles.viewAllCard}>
              <div className={styles.iconCircle}>
                <MdArrowForward />
              </div>
              <span>View All</span>
            </Link>
          )}
        </div>
        <button className={`${styles.navBtn} ${styles.right}`} onClick={() => scrollSlider("right")}>
          <MdChevronRight />
        </button>
      </div>
    </div>
  );
};

export default AnimeSchedule;
