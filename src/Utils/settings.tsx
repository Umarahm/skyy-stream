export type AppHub = "movieTv" | "japanese" | "sports";

export type RiveSettings = {
  theme: string;
  mode: string;
  ascent_color: string;
  SFFamily: string;
  SFColor: string;
  SFSize: string;
  SBColor: string;
  SBBlur: string;
  SOpacity: string;
  hub: AppHub | "";
};

const defaultSettings: RiveSettings = {
  theme: "system",
  mode: "system",
  ascent_color: "gold",
  SFFamily: "Roboto Mono",
  SFColor: "gold",
  SFSize: "24px",
  SBColor: "transparent",
  SBBlur: "0",
  SOpacity: "100%",
  hub: "",
};

export const getSettings = (): RiveSettings => {
  const rawValues = localStorage.getItem("RiveStreamSettings");
  if (!rawValues) return defaultSettings;

  try {
    const parsed = JSON.parse(rawValues);
    return { ...defaultSettings, ...(parsed || {}) };
  } catch (error) {
    return defaultSettings;
  }
};

export const setSettings = ({ values }: { values: Partial<RiveSettings> }) => {
  const mergedValues = { ...getSettings(), ...values };
  localStorage.setItem("RiveStreamSettings", JSON.stringify(mergedValues));
};

export const getHub = (): AppHub | "" => {
  if (typeof window === "undefined") return "";
  return (sessionStorage.getItem("RiveStreamHub") as AppHub | "") || "";
};

export const setHub = (hub: AppHub | "") => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("RiveStreamHub", hub);
  window.dispatchEvent(new Event("hubChanged"));
};
