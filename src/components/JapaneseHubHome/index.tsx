import { useEffect, useState } from "react";
import {
  getMiruroBanner,
  getMiruroDisplayTitle,
  getMiruroMediaLabel,
  getMiruroPopular,
  getMiruroPoster,
  getMiruroSpotlight,
  getMiruroTrending,
  getMiruroUpcoming,
} from "@/Utils/miruro";
import MovieCardSmall from "@/components/MovieCardSmall";
import AnimeSchedule from "@/components/AnimeSchedule";
import styles from "./style.module.scss";
import Link from "next/link";
import Carousel from "@/components/Carousel";
import Skeleton from "react-loading-skeleton";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { setHub } from "@/Utils/settings";
import { useRouter } from "next/navigation";

const JapaneseHubHome = () => {
  const { push } = useRouter();
  const [spotlight, setSpotlight] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [spotlightRes, trendingRes, popularRes, upcomingRes] = await Promise.all([
          getMiruroSpotlight(),
          getMiruroTrending(),
          getMiruroPopular(),
          getMiruroUpcoming(),
        ]);
        setSpotlight(spotlightRes?.results || []);
        setTrending(trendingRes?.results || []);
        setPopular(popularRes?.results || []);
        setUpcoming(upcomingRes?.results || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getName = (item: any) => getMiruroDisplayTitle(item);
  const getPoster = (item: any) => getMiruroPoster(item);
  const getBanner = (item: any) => getMiruroBanner(item);
  const getId = (item: any) => item?.id || item?.malId || item?._id;
  const detailHref = (item: any) => {
    const id = getId(item);
    return id ? `/anime-details?id=${id}` : "/anime";
  };
  const hero = spotlight?.[heroIndex] || spotlight?.[0];
  const heroImages = spotlight
    ?.map((item) => getBanner(item))
    ?.filter(Boolean) as string[];
  const heroTitle = getName(hero);
  const heroTitleLength = heroTitle.length;
  const heroTitleClass =
    heroTitleLength > 70
      ? styles.titleXs
      : heroTitleLength > 50
        ? styles.titleSm
        : heroTitleLength > 35
          ? styles.titleMd
          : styles.titleLg;

  const toCardData = (item: any) => ({
    id: getId(item) || getName(item),
    name: getName(item),
    title: getName(item),
    poster_path: getPoster(item),
    mediaLabel: getMiruroMediaLabel(item),
  });

  const sections = [
    { label: "Trending", list: trending },
    { label: "Popular", list: popular },
    { label: "Upcoming", list: upcoming },
    { label: "Spotlight Picks", list: spotlight },
    { label: "Trending Mix", list: trending.slice(6) },
    { label: "Popular Classics", list: popular.slice(6) },
    { label: "Upcoming Hype", list: upcoming.slice(6) },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.HomeHero}>
        <button
          type="button"
          className={`${styles.changeHubBtn} btn`}
          onClick={() => {
            setHub("");
            push("/");
          }}
        >
          Change Hub
        </button>
        <div className={styles.HomeCarousel}>
          {heroImages?.length > 0 ? (
            <Carousel
              imageArr={heroImages}
              setIndex={setHeroIndex}
              mobileHeight="60vh"
              desktopHeight="80vh"
              objectFit="cover"
            />
          ) : (
            <Skeleton className={styles.CarouselLoading} />
          )}
          <div className={styles.curvy}></div>
          <div className={styles.curvy2}></div>
          <div className={styles.curvy3}></div>
          <div className={styles.curvy4}></div>
          <div className={styles.HomeHeroMeta}>
            <h1
              className={heroTitleClass}
              data-tooltip-id="tooltip"
              data-tooltip-content={hero ? heroTitle : "name"}
            >
              {hero ? heroTitle : <Skeleton />}
            </h1>
            <div className={styles.HomeHeroMetaRow2}>
              <p className={styles.type}>
                {hero ? getMiruroMediaLabel(hero) : <Skeleton width={60} />}
              </p>
              {hero ? (
                <Link className={styles.links} href={detailHref(hero)}>
                  detail
                </Link>
              ) : (
                <div>
                  <Skeleton width={200} count={1} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      <div className={styles.HomeListAll}>
        {sections.map((section, sectionIndex) => (
          <section className={styles.section} key={section.label}>
            <h1>
              {section.label}
              <div>
                <MdChevronLeft
                  onClick={() => {
                    document
                      .querySelectorAll(`.${styles.HomeListSection}`)
                    [sectionIndex]?.scrollBy(-700, 0);
                  }}
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Swipe Left"
                />
                swipe
                <MdChevronRight
                  onClick={() => {
                    document
                      .querySelectorAll(`.${styles.HomeListSection}`)
                    [sectionIndex]?.scrollBy(700, 0);
                  }}
                  data-tooltip-id="tooltip"
                  data-tooltip-content="Swipe Right"
                />
              </div>
            </h1>
            <div className={styles.HomeListSection}>
              {(loading || section.list.length === 0) &&
                [1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton key={item} className={styles.loading} />
                ))}
              {section.list.map((item: any) => {
                const mapped = toCardData(item);
                return (
                  <MovieCardSmall
                    key={`${section.label}-${mapped.id}`}
                    data={mapped}
                    media_type="tv"
                    customHref={detailHref(item)}
                  />
                );
              })}
            </div>
          </section>
        ))}
        <AnimeSchedule />

      </div>
    </div>
  );
};

export default JapaneseHubHome;
