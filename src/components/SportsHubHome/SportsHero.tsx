import { useRef, useState } from "react";
import styles from "./style.module.scss";
import Carousel, { CarouselHandle } from "@/components/Carousel";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/opacity.css";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { setHub } from "@/Utils/settings";
import { useRouter } from "next/navigation";
import { NormalizedMatch, getMatchStatusLabel } from "@/Utils/sports";

const HERO_SLIDE_COUNT = 8;

const SportsHero = ({ matches }: { matches: NormalizedMatch[] }) => {
  const { push } = useRouter();
  const [index, setIndex] = useState(0);
  const carouselRef = useRef<CarouselHandle>(null);
  const slides = matches.slice(0, HERO_SLIDE_COUNT);
  const images = slides.map((match) => match.backdrop || "/images/NoSportImgFound.svg");
  const current = slides[index];

  return (
    <div className={styles.SportsHero}>
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
      <div className={styles.HeroCarousel}>
        {images.length > 0 ? (
          <>
            <Carousel
              ref={carouselRef}
              imageArr={images}
              setIndex={setIndex}
              mobileHeight="60vh"
              desktopHeight="80vh"
              objectFit={"cover"}
            />
            <div className={styles.heroNavControls}>
              <MdChevronLeft
                onClick={() => carouselRef.current?.previous()}
                data-tooltip-id="tooltip"
                data-tooltip-content="Previous"
              />
              swipe
              <MdChevronRight
                onClick={() => carouselRef.current?.next()}
                data-tooltip-id="tooltip"
                data-tooltip-content="Next"
              />
            </div>
          </>
        ) : (
          <Skeleton className={styles.CarouselLoading} />
        )}
        <div className={styles.curvy}></div>
        <div className={styles.curvy2}></div>
        <div className={styles.curvy3}></div>
        <div className={styles.curvy4}></div>

        <div className={styles.HeroMeta}>
          {current ? (
            <>
              {current.banner && current.banner !== current.backdrop && (
                <LazyLoadImage
                  src={current.banner}
                  alt={`${current.homeName} vs ${current.awayName}`}
                  effect="opacity"
                  className={`${styles.matchupBanner} skeleton`}
                />
              )}
              <p className={styles.competition}>{current.competition || current.sportLabel}</p>
              <div className={styles.scoreRow}>
                <div className={styles.team}>
                  {current.homeLogo ? (
                    <LazyLoadImage
                      src={current.homeLogo}
                      alt={current.homeName}
                      effect="opacity"
                      className="skeleton"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48 }} />
                  )}
                  <span>{current.homeName}</span>
                </div>
                <div className={styles.score}>
                  {current.status === "pre" ? (
                    "vs"
                  ) : (
                    <span>
                      {current.homeScore ?? "-"} : {current.awayScore ?? "-"}
                    </span>
                  )}
                  <span className={styles.statusLine}>{getMatchStatusLabel(current).label}</span>
                </div>
                <div className={styles.team}>
                  {current.awayLogo ? (
                    <LazyLoadImage
                      src={current.awayLogo}
                      alt={current.awayName}
                      effect="opacity"
                      className="skeleton"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div style={{ width: 48, height: 48 }} />
                  )}
                  <span>{current.awayName}</span>
                </div>
              </div>
            </>
          ) : (
            <Skeleton width={200} count={1} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SportsHero;
