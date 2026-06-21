import type { AppHub } from "./settings";

export const HUB_DEFAULT_ROUTE: Record<AppHub, string> = {
  movieTv: "/",
  japanese: "/japanese",
};

const SHARED_ROUTES = new Set([
  "/settings",
  "/downloads",
  "/disclaimer",
  "/announcements",
  "/login",
  "/signup",
  "/404",
  "/_offline",
]);

const MOVIE_TV_ROUTES = new Set([
  "/",
  "/movie",
  "/tv",
  "/search",
  "/detail",
  "/watch",
  "/library",
  "/collections",
  "/recommendation",
  "/person",
  "/kdrama",
]);

const JAPANESE_ROUTES = new Set([
  "/japanese",
  "/anime",
  "/anime-search",
  "/detail",
  "/watch",
  "/manga",
  "/manga-detail",
  "/manga-search",
  "/manga-read",
  "/anime-detail",
  "/anime-details",
  "/anime-watch",
  "/schedule",
]);

export const getRouteSection = (pathname: string | null) => {
  if (!pathname) return "/";
  const normalizedPath = pathname.split("?")[0].split("#")[0];
  const arr = normalizedPath.split("/");
  return `/${arr[1] || ""}`.replace("//", "/");
};

export const isRouteAllowedForHub = (
  hub: AppHub,
  pathname: string | null,
): boolean => {
  const section = getRouteSection(pathname);
  if (SHARED_ROUTES.has(section)) return true;
  if (hub === "movieTv") return MOVIE_TV_ROUTES.has(section);
  return JAPANESE_ROUTES.has(section);
};
