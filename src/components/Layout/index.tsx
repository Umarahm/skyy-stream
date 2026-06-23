import React, { useState, useEffect } from "react";
// import Spinner from "@/components/Spinner";
import styles from "./style.module.scss";
import Navbar from "../Navbar";
import { motion } from "framer-motion";
import { AppHub, getHub, getSettings, setHub } from "@/Utils/settings";
import SettingsPage from "../SettingsPage";
import { usePathname } from "next/navigation";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { fetchRandom } from "@/Utils/randomdata";
import { HUB_DEFAULT_ROUTE, isRouteAllowedForHub } from "@/Utils/hub";

const Layout = ({ children }: any) => {
  const [theme, setTheme] = useState("system");
  const [mode, setMode] = useState("system");
  const [ascent_color, setAscent_color] = useState("gold");
  const [SFFamily, setSFFamily] = useState("Roboto Mono");
  const [SFColor, setSFColor] = useState("gold");
  const [SFSize, setSFSize] = useState("24px");
  const [SBColor, setSBColor] = useState("transparent");
  const [SBBlur, setSBBlur] = useState("0");
  const [SOpacity, setSOpacity] = useState("100%");
  const [themeColor, setThemeColor] = useState<any>();
  const [hub, setSelectedHub] = useState<AppHub | "">("");
  const [isHubInitialized, setIsHubInitialized] = useState(false);
  const { push } = useRouter();
  const path = usePathname();

  const fetchRandomData = async () => {
    const res: any = await fetchRandom();
    console.log({ res });
    if (res?.type && res?.id) {
      push(`/detail?type=${res.type}&id=${res.id}`);
    }
  };

  useEffect(() => {
    const handleHubChange = () => {
      setSelectedHub(getHub());
    };
    window.addEventListener("hubChanged", handleHubChange);
    return () => window.removeEventListener("hubChanged", handleHubChange);
  }, []);

  useEffect(() => {
    const values = getSettings();
    if (values !== null) {
      setTheme(values?.theme);
      setMode(values?.mode);
      setAscent_color(values?.ascent_color);
      setSFFamily(values?.SFFamily);
      setSFColor(values?.SFColor);
      setSFSize(values?.SFSize);
      setSBColor(values?.SBColor);
      setSBBlur(values?.SBBlur);
      setSOpacity(values?.SOpacity);
    }
    setSelectedHub(getHub());
    setIsHubInitialized(true);
    const prefersDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themeColor = prefersDarkMode ? "#1b1919" : "#f4f7fe";
    setThemeColor(themeColor);

    window.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        const activeHub = getHub();
        push(activeHub === "japanese" ? "/anime-search" : "/search");
      }
      if (event.ctrlKey && event.key === "R") {
        event.preventDefault();
        fetchRandomData();
      }
    });
    // console.log({ prefersDarkMode });
    // const metaThemeColor = document.querySelector("meta[name=theme-color]");
    // metaThemeColor?.setAttribute("content", themeColor);
  }, []);

  useEffect(() => {
    if (!isHubInitialized || !hub || !path) return;
    if (!isRouteAllowedForHub(hub, path)) {
      push(HUB_DEFAULT_ROUTE[hub]);
    }
  }, [hub, path, push, isHubInitialized]);

  useEffect(() => {
    document.documentElement.style.setProperty("--mode", mode);
    document.documentElement.style.setProperty("--ascent-color", ascent_color);
    document.documentElement.style.setProperty("--SFFamily", SFFamily);
    document.documentElement.style.setProperty("--SFSize", SFSize);
    document.documentElement.style.setProperty("--SFColor", SFColor);
    document.documentElement.style.setProperty("--SBColor", SBColor);
    document.documentElement.style.setProperty("--SBBlur", SBBlur);
    document.documentElement.style.setProperty("--SOpacity", SOpacity);
  }, [
    mode,
    ascent_color,
    SFFamily,
    SFSize,
    SFColor,
    SBColor,
    SBBlur,
    SOpacity,
  ]);

  const handleHubSelect = (value: AppHub) => {
    setSelectedHub(value);
    setHub(value);
    push(HUB_DEFAULT_ROUTE[value]);
  };

  return (
    <>
      {mode === "dark" && (
        <Head>
          <meta name="theme-color" content="#1b1919" />
          <meta name="msapplication-TileColor" content="#1b1919" />
        </Head>
      )}
      {mode === "light" && (
        <Head>
          <meta name="theme-color" content="#f4f7fe" />
          <meta name="msapplication-TileColor" content="#f4f7fe" />
        </Head>
      )}
      {mode === "system" && (
        <Head>
          <meta name="theme-color" content={`${themeColor}`} />
          <meta name="msapplication-TileColor" content={`${themeColor}`} />
        </Head>
      )}
      <div
        className={`${styles.background} ${mode === "dark" && "dark"} ${mode === "light" && "light"} ${hub === "japanese" ? "hub-japanese" : hub === "sports" ? "hub-sports" : "hub-movieTv"}`}
      >
        {!hub && isHubInitialized ? (
          <div className={styles.hubGate}>
            <h1>Choose your hub</h1>
            <p>Select where you want to start. You can switch anytime.</p>
            <div className={styles.hubChoices}>
              <button
                className={`${styles.hubChoiceCard} ${styles.movieCard}`}
                onClick={() => handleHubSelect("movieTv")}
                type="button"
              >
                <div className={styles.hubCardContent}>
                  <img src="/images/logo.svg" alt="Movie TV hub logo" />
                  <h2>Rive Movies/TV</h2>
                </div>
              </button>
              <button
                className={`${styles.hubChoiceCard} ${styles.animeCard}`}
                onClick={() => handleHubSelect("japanese")}
                type="button"
              >
                <div className={styles.hubCardContent}>
                  <img
                    src="/images/japanese-hub-img.webp"
                    alt="Japanese hub logo"
                  />
                  <h2>Rive Anime & Manga</h2>
                </div>
              </button>
              <button
                className={`${styles.hubChoiceCard} ${styles.sportsCard}`}
                onClick={() => handleHubSelect("sports")}
                type="button"
              >
                <div className={styles.hubCardContent}>
                  <img src="/images/sports-logo.webp" alt="Rive Sports hub logo" />
                  <h2>Rive Sports</h2>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <>
            <Navbar hub={hub} />
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
            >
              {children}
            </motion.div>
          </>
        )}
        {path === "/settings" ? (
          <SettingsPage
            mode={mode}
            theme={theme}
            ascent_color={ascent_color}
            SFFamily={SFFamily}
            SFColor={SFColor}
            SFSize={SFSize}
            SBColor={SBColor}
            SBBlur={SBBlur}
            SOpacity={SOpacity}
            setMode={setMode}
            setTheme={setTheme}
            setAscent_color={setAscent_color}
            setSFFamily={setSFFamily}
            setSFColor={setSFColor}
            setSFSize={setSFSize}
            setSBColor={setSBColor}
            setSBBlur={setSBBlur}
            setSOpacity={setSOpacity}
            hub={hub}
            onHubChange={handleHubSelect}
          />
        ) : null}
      </div>
    </>
  );
};

export default Layout;
