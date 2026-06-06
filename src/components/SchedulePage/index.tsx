import React, { useEffect, useState, useMemo } from "react";
import styles from "./style.module.scss";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getHub } from "@/Utils/settings";

const SchedulePage = () => {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hub = getHub();

  const daysList = useMemo(() => {
    const list = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 1);

    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      list.push(date);
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_MIRURO_API}/schedule`);
        const json = await res.json();
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

  const filteredSchedule = useMemo(() => {
    return scheduleData
      .filter((item) => {
        const airingDate = new Date(item.airingAt * 1000);
        return isSameDay(airingDate, selectedDate);
      })
      .sort((a, b) => a.airingAt - b.airingAt);
  }, [scheduleData, selectedDate]);

  const formatDayOfWeek = (date: Date) => {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    return days[date.getDay()];
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };

  const getDetailHref = (item: any) => {
    const id = item?.id || item?.aniId || item?.malId;
    return id ? `/anime-details?id=${id}` : "/anime";
  };

  return (
    <div className={styles.schedulePage}>
      <Navbar hub={hub} />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Weekly Schedule</h1>
          <p>Keep track of your favorite anime airing times</p>
        </div>

        <div className={styles.daySelectorWrapper}>
          <div className={styles.daysList}>
            {daysList.map((date, idx) => {
              const isActive = isSameDay(date, selectedDate);
              return (
                <div
                  key={idx}
                  className={`${styles.dayItem} ${isActive ? styles.active : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={styles.dayLabel}>{formatDayOfWeek(date)}</div>
                  <div className={styles.dateLabel}>{date.getDate()}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.timelineContainer}>
          {loading ? (
            <p className={styles.message}>Loading schedule...</p>
          ) : filteredSchedule.length > 0 ? (
            <div className={styles.timeline}>
              {/* Central vertical line */}
              <div className={styles.line}></div>
              
              {filteredSchedule.map((item, idx) => {
                const image =
                  item.coverImage?.extraLarge ||
                  item.coverImage?.large ||
                  item.bannerImage ||
                  "/images/logo.svg";
                
                const isEven = idx % 2 === 0;

                return (
                  <div key={idx} className={`${styles.timelineRow} ${isEven ? styles.leftSide : styles.rightSide}`}>
                    
                    {/* The Card */}
                    <div className={styles.cardContainer}>
                      <Link href={getDetailHref(item)} className={styles.animeCard}>
                        <div className={styles.posterWrapper}>
                          <div
                            className={styles.poster}
                            style={{ backgroundImage: `url(${image})` }}
                          ></div>
                          <div className={styles.episodeBadge}>E{item.next_episode}</div>
                        </div>
                        <div className={styles.info}>
                          <h3 className={styles.title} title={item.title?.english || item.title?.romaji}>
                            {item.title?.english || item.title?.romaji}
                          </h3>
                          {item.genres && item.genres.length > 0 && (
                            <div className={styles.genres}>
                              {item.genres.slice(0, 3).map((g: string) => (
                                <span key={g} className={styles.genrePill}>{g}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* Timeline Dot */}
                    <div className={styles.dotContainer}>
                      <div className={styles.dot}>
                        <div className={styles.innerDot}></div>
                      </div>
                    </div>

                    {/* The Time */}
                    <div className={styles.timeContainer}>
                      <div className={styles.timeText}>{formatTime(item.airingAt)}</div>
                      <div className={styles.episodeText}>EPISODE {item.next_episode}</div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.message}>No anime scheduled for this day.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
