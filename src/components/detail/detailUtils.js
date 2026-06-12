// Try to fetch reasonable resolution images for the banner to balance quality and speed
export const getHiRes = (url) => {
  if (!url || typeof url !== "string") return url;
  // Use w1280 for banner instead of original to speed up loading
  return url.replace(/\/w(92|154|185|300|342|500|780)\//, "/w1280/");
};

export { getOptimizedBanner as getOptimizedImage } from "../../utils/image-helper.js";

export const formatTime = (secs) => {
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};
