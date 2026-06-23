import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./style.module.scss";
import { useFifaLoadingState } from "@/Utils/FifaLoadingContext";

// lottie-react pulls in lottie-web, which touches `document` — load it
// client-only so it doesn't break SSR.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const MOBILE_BREAKPOINT = 768;
const MOBILE_SRC = "/animations/MobileAnimationJSON.json";
const DESKTOP_SRC = "/animations/DesktoporTabletAnimationJSON.json";

// Animation JSON is ~1-1.2MB — fetched at runtime from /public instead of
// bundled via import, so it doesn't bloat the page's JS chunk.
const animationCache = new Map<string, Promise<any>>();
const loadAnimation = (src: string) => {
  if (!animationCache.has(src)) {
    animationCache.set(src, fetch(src).then((res) => res.json()));
  }
  return animationCache.get(src)!;
};

const FifaLoadingOverlay = () => {
  const loading = useFifaLoadingState();
  const [animationData, setAnimationData] = useState<any>(null);
  // The overlay must always finish a full loop before disappearing — even if
  // data finishes loading mid-loop, so the animation never looks cut off.
  const [canHide, setCanHide] = useState(false);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  useEffect(() => {
    if (!loading) return;
    setCanHide(false);
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    let active = true;
    loadAnimation(isMobile ? MOBILE_SRC : DESKTOP_SRC).then((data) => {
      if (active) setAnimationData(data);
    });
    return () => {
      active = false;
    };
  }, [loading]);

  const handleLoopComplete = () => {
    if (!loadingRef.current) setCanHide(true);
  };

  if (!loading && canHide) return null;
  if (!animationData) return loading ? <div className={styles.overlay} /> : null;

  return (
    <div className={styles.overlay}>
      <Lottie
        animationData={animationData}
        loop
        autoplay
        onLoopComplete={handleLoopComplete}
        className={styles.animation}
      />
    </div>
  );
};

export default FifaLoadingOverlay;
