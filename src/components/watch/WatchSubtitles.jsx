import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Languages,
  Play,
  Search,
  AlertCircle,
  Eye,
  EyeOff,
  CornerDownLeft,
  Info,
  Clock,
  RefreshCw
} from "lucide-react";
import { parseEpisodeNumber } from "../../utils/episodes.js";

// Helper to extract and normalize original (Asian) and English titles from KKphim/Ophim movie data
const extractMovieTitles = (movie) => {
  if (!movie) return { original: "", english: "", all: [] };

  const rawOrigin = movie.origin_name || "";
  const rawName = movie.name || "";

  const candidates = [];

  // Split by slashes, commas, semicolons to isolate different language names
  [rawOrigin, rawName].forEach(str => {
    if (!str) return;
    const parts = str.split(/[\/;,]/).map(p => p.trim()).filter(Boolean);
    candidates.push(...parts);
  });

  const uniqueCandidates = [...new Set(candidates)];

  // Regex to detect Asian characters
  const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);
  const hasKorean = (text) => /[\uac00-\ud7a3]/.test(text);
  const hasJapanese = (text) => /[\u3040-\u309f\u30a0-\u30ff]/.test(text);

  // Original Asian characters title
  const originalTitle = uniqueCandidates.find(c => hasChinese(c) || hasKorean(c) || hasJapanese(c)) || "";

  // English title candidate (strictly alphanumeric and English characters, no accents)
  const isEnglishOnly = (text) => /^[a-zA-Z0-9\s\-\:\'\!\&\.\,\?]+$/.test(text);
  const englishTitle = uniqueCandidates.find(c => isEnglishOnly(c)) || uniqueCandidates.find(c => !hasChinese(c) && !hasKorean(c) && !hasJapanese(c)) || uniqueCandidates[0] || "";

  return {
    original: originalTitle,
    english: englishTitle,
    all: uniqueCandidates
  };
};

// Helper to determine the movie's country
const getMovieCountry = (movie) => {
  if (!movie || !movie.country) return "unknown";
  const countryList = Array.isArray(movie.country)
    ? movie.country.map(c => (c.name || c || "").toString().toLowerCase())
    : [movie.country.toString().toLowerCase()];

  if (countryList.some(c => c.includes("trung quốc") || c.includes("china"))) return "china";
  if (countryList.some(c => c.includes("hàn quốc") || c.includes("korea"))) return "korea";
  if (countryList.some(c => c.includes("nhật") || c.includes("japan"))) return "japan";
  if (countryList.some(c => c.includes("mỹ") || c.includes("us") || c.includes("uk") || c.includes("anh"))) return "western";
  return "other";
};

// Helper to convert seconds to subtitle timestamp format (HH:MM:SS.mmm)
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return "00:00:00.000";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
};

// Parses SRT or VTT text to subtitle objects
const parseSubtitleText = (text) => {
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = cleanText.split(/\n\s*\n/);
  const lines = [];

  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

  let idCounter = 1;
  blocks.forEach((block) => {
    const parts = block.trim().split("\n");
    if (parts.length < 2) return;

    let timeIndex = 0;
    if (!timeRegex.test(parts[0]) && timeRegex.test(parts[1])) {
      timeIndex = 1;
    } else if (!timeRegex.test(parts[0])) {
      return;
    }

    const timeMatch = parts[timeIndex].match(timeRegex);
    if (!timeMatch) return;

    const startSecs =
      parseInt(timeMatch[1], 10) * 3600 +
      parseInt(timeMatch[2], 10) * 60 +
      parseInt(timeMatch[3], 10) +
      parseInt(timeMatch[4], 10) / 1000;

    const endSecs =
      parseInt(timeMatch[5], 10) * 3600 +
      parseInt(timeMatch[6], 10) * 60 +
      parseInt(timeMatch[7], 10) +
      parseInt(timeMatch[8], 10) / 1000;

    const contentLines = parts.slice(timeIndex + 1).map(l => l.trim()).filter(Boolean);
    const original = contentLines.join("\n");

    if (original) {
      lines.push({
        id: idCounter++,
        startTime: startSecs,
        endTime: endSecs,
        text: original,
        translation: "",
      });
    }
  });

  return lines;
};

// Retrieve API configurations from environment variables
const OPEN_SUBTITLES_API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY || "NYDqQqfHesxLjC8lw2edheWeIEfcyG2u";
const OPEN_SUBTITLES_USER_AGENT = import.meta.env.VITE_OPENSUBTITLES_USER_AGENT || "MovieWebPlayer v1.0";
const OPEN_SUBTITLES_USERNAME = import.meta.env.VITE_OPENSUBTITLES_USERNAME || "";
const OPEN_SUBTITLES_PASSWORD = import.meta.env.VITE_OPENSUBTITLES_PASSWORD || "";

const WatchSubtitles = ({
  player,
  slug,
  activeEpisode,
  movie,
  subtitles,
  setSubtitles,
  showSubtitleOverlay,
  setShowSubtitleOverlay,
  selectedLanguage: externalLanguage,
  setSelectedLanguage: externalSetLanguage
}) => {
  const [activeId, setActiveId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  // Use external language state if provided, otherwise fallback to internal
  const [internalLanguage, setInternalLanguage] = useState("zh");
  const selectedLanguage = externalLanguage ?? internalLanguage;
  const setSelectedLanguage = externalSetLanguage ?? setInternalLanguage;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Custom manual search query input
  const [customSearchQuery, setCustomSearchQuery] = useState("");

  // Raw downloaded subtitles (without offset applied)
  const [rawSubtitles, setRawSubtitles] = useState([]);
  // Time offset in seconds (e.g. +3s, -1.5s) to fix desynchronization issues
  const [timeOffset, setTimeOffset] = useState(0);

  // Versions available for selection
  const [subtitleVersions, setSubtitleVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");

  // Authenticated token state
  const [authToken, setAuthToken] = useState(null);

  const listContainerRef = useRef(null);
  const docId = `${slug || "movie"}__${activeEpisode?.slug || "ep-1"}`;

  // 1. Authenticate user to bypass anonymous limits (20 downloads/day)
  useEffect(() => {
    const handleLogin = async () => {
      if (!OPEN_SUBTITLES_USERNAME || !OPEN_SUBTITLES_PASSWORD) return;
      try {
        const res = await fetch("https://api.opensubtitles.com/api/v1/login", {
          method: "POST",
          headers: {
            "Api-Key": OPEN_SUBTITLES_API_KEY,
            "X-User-Agent": OPEN_SUBTITLES_USER_AGENT,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            username: OPEN_SUBTITLES_USERNAME,
            password: OPEN_SUBTITLES_PASSWORD
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setAuthToken(data.token);
            console.log("Đăng nhập OpenSubtitles thành công.");
          }
        }
      } catch (err) {
        console.warn("Lỗi đăng nhập OpenSubtitles:", err);
      }
    };
    handleLogin();
  }, []);

  // 2. Initialize search query input when movie/episode/language changes
  useEffect(() => {
    if (movie) {
      const titles = extractMovieTitles(movie);
      const country = getMovieCountry(movie);

      let defaultQuery = "";
      if (selectedLanguage === "zh" && (country === "china" || titles.original)) {
        // Prioritize Chinese title for Chinese subtitles of Chinese dramas
        defaultQuery = titles.original || titles.english;
      } else {
        // Prioritize English title for English subtitles or Western movies
        defaultQuery = titles.english || titles.original;
      }

      setCustomSearchQuery(defaultQuery);
      setTimeOffset(0); // Reset delay offset
    }
  }, [movie, activeEpisode, selectedLanguage]);

  // Main search and download logic
  const performSearch = async (queryText) => {
    if (!queryText.trim()) return;

    setIsLoading(true);
    setErrorMsg("");
    setSubtitleVersions([]);
    setSelectedVersionId([]);
    setRawSubtitles([]);
    setSubtitles([]);

    try {
      const langParam = selectedLanguage === "zh" ? "zh,zh-cn,zh-tw" : selectedLanguage;
      const episodeNum = parseEpisodeNumber(activeEpisode?.slug || activeEpisode?.name);

      const headers = {
        "Api-Key": OPEN_SUBTITLES_API_KEY,
        "X-User-Agent": OPEN_SUBTITLES_USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json"
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      let results = [];
      let res;

      // Stage 1: Highly precise search (query, episode, season, and year)
      let stage1Url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(queryText.trim())}&languages=${langParam}`;
      if (episodeNum) {
        stage1Url += `&episode_number=${episodeNum}&season_number=1`;
      }
      if (movie && movie.year) {
        stage1Url += `&year=${movie.year}`;
      }

      console.log("Tìm kiếm phụ đề Stage 1:", stage1Url);
      res = await fetch(stage1Url, { method: "GET", headers });
      if (res.ok) {
        const data = await res.json();
        results = data.data || [];
      }

      // Stage 2 Fallback: Precise search without year (in case year is wrong or not indexed)
      if (results.length === 0 && movie && movie.year) {
        let stage2Url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(queryText.trim())}&languages=${langParam}`;
        if (episodeNum) {
          stage2Url += `&episode_number=${episodeNum}&season_number=1`;
        }
        console.log("Tìm kiếm phụ đề Stage 2 (Không năm):", stage2Url);
        res = await fetch(stage2Url, { method: "GET", headers });
        if (res.ok) {
          const data = await res.json();
          results = data.data || [];
        }
      }

      // Stage 3 Fallback: Broad string search with E01 suffix (in case episode is uploaded flatly)
      if (results.length === 0) {
        let broadQuery = queryText.trim();
        if (episodeNum) {
          broadQuery += ` E${episodeNum.toString().padStart(2, "0")}`;
        }
        const stage3Url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(broadQuery)}&languages=${langParam}`;
        console.log("Tìm kiếm phụ đề Stage 3 (Tên thô):", stage3Url);
        res = await fetch(stage3Url, { method: "GET", headers });
        if (res.ok) {
          const data = await res.json();
          results = data.data || [];
        }
      }

      // STRICT VALIDATION STAGE: Filter out incorrect results by comparing title and year
      const titles = extractMovieTitles(movie);
      const movieNames = titles.all;
      const targetYear = movie.year ? parseInt(movie.year) : null;
      const normalize = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

      let filteredResults = results.filter((item) => {
        const attrs = item.attributes || {};
        const details = attrs.feature_details || {};

        // 1. Year check (allow +/- 1 year tolerance if both are available)
        if (targetYear && details.year) {
          const diff = Math.abs(parseInt(details.year) - targetYear);
          if (diff > 1) return false;
        }

        // Collect all possible title strings from the API response
        const candidateTitles = [
          normalize(details.title),
          normalize(details.original_title),
          normalize(details.movie_name || details.parent_title),
          // Also extract title from release filename (e.g. "Perfect.Crown.S01E01.1080p" → "perfectcrown")
          normalize((attrs.release || "").replace(/[._]/g, " ").replace(/S\d+E\d+.*/i, "").trim())
        ].filter(t => t.length > 0); // Remove empty strings

        // If API returned no title info at all, reject this result (unknown origin)
        if (candidateTitles.length === 0) return false;

        // 2. Strict title matching: require normalized equality
        const hasTitleMatch = movieNames.some(name => {
          const nameNorm = normalize(name);
          if (!nameNorm) return false;

          return candidateTitles.some(candidate => {
            // Exact normalized match
            if (candidate === nameNorm) return true;
            // One fully contains the other, but ONLY if the shorter one is substantial (>= 4 chars)
            if (candidate.length >= 4 && nameNorm.length >= 4) {
              if (candidate.includes(nameNorm) || nameNorm.includes(candidate)) return true;
            }
            return false;
          });
        });

        return hasTitleMatch;
      });

      // Apply strict filtered results (no fallback to incorrect movies)
      results = filteredResults;
      console.log(`Lọc phụ đề: ${filteredResults.length} kết quả khớp tên phim từ ${results.length + filteredResults.length} kết quả thô.`);

      if (results.length === 0) {
        setErrorMsg(`Không tìm thấy phụ đề ${selectedLanguage.toUpperCase()} phù hợp cho từ khóa "${queryText}". Hãy thử gõ tên tiếng Anh khác của phim.`);
        return;
      }

      // Map versions
      const mappedVersions = results.map((item) => {
        const attrs = item.attributes || {};
        const files = attrs.files || [];
        return {
          id: item.id,
          fileId: files[0]?.file_id,
          fileName: attrs.release || files[0]?.file_name || "Bản phụ đề gốc",
          lang: attrs.language,
          downloads: attrs.download_count || 0,
          votes: attrs.votes || 0
        };
      }).sort((a, b) => b.downloads - a.downloads); // Sort by download count

      setSubtitleVersions(mappedVersions);

      // Auto-select and download the first (best) version
      const bestVersion = mappedVersions[0];
      setSelectedVersionId(bestVersion.id);
      await downloadSubtitle(bestVersion);

    } catch (err) {
      console.error("Lỗi tìm kiếm phụ đề:", err);
      setErrorMsg("Lỗi tải phụ đề từ OpenSubtitles: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all subtitle states when movie or episode changes to prevent stale data
  useEffect(() => {
    setErrorMsg("");
    setSubtitleVersions([]);
    setSelectedVersionId("");
    setRawSubtitles([]);
    setSubtitles([]);
  }, [movie, activeEpisode]);

  // Trigger search on mount, episode change, or language change, but only if subtitle overlay is enabled
  useEffect(() => {
    if (!slug || !activeEpisode || !movie) return;
    if (!showSubtitleOverlay) return; // Không gọi API tìm kiếm phụ đề nếu chế độ hiển thị đang tắt

    const titles = extractMovieTitles(movie);
    const country = getMovieCountry(movie);

    let queryText = "";
    if (selectedLanguage === "zh" && (country === "china" || titles.original)) {
      queryText = titles.original || titles.english;
    } else {
      queryText = titles.english || titles.original;
    }

    if (queryText) {
      performSearch(queryText);
    }
  }, [selectedLanguage, activeEpisode, movie, slug, showSubtitleOverlay]);

  // Download and parse subtitle by version
  const downloadSubtitle = async (version) => {
    if (!version || !version.fileId) return;

    try {
      const downloadEndpoint = "https://api.opensubtitles.com/api/v1/download";

      const headers = {
        "Api-Key": OPEN_SUBTITLES_API_KEY,
        "X-User-Agent": OPEN_SUBTITLES_USER_AGENT,
        "Content-Type": "application/json",
        "Accept": "application/json"
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      // Call OpenSubtitles API directly (NO CORS proxy for requesting the download link)
      const res = await fetch(downloadEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ file_id: version.fileId })
      });

      if (!res.ok) {
        if (res.status === 406) {
          throw new Error("Giới hạn lượt tải hàng ngày của bạn đã hết. Hãy đợi sau 24h để tăng hạn mức lên 20 lượt tải");
        }
        throw new Error("Không lấy được đường dẫn tải trực tiếp.");
      }

      const downloadData = await res.json();
      const downloadLink = downloadData.link;

      if (!downloadLink) {
        throw new Error("Không lấy được đường dẫn tải trực tiếp.");
      }

      // Fetch file content (Only here we use the CORS proxy because download mirror hosts usually don't have CORS enabled)
      const fileRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(downloadLink)}`);
      if (!fileRes.ok) {
        throw new Error("Không thể kết nối tải tệp phụ đề từ mirror host.");
      }

      const text = await fileRes.text();
      const parsedLines = parseSubtitleText(text);

      if (parsedLines.length === 0) {
        throw new Error("Không phân tích được định dạng dòng phụ đề.");
      }

      setRawSubtitles(parsedLines);
    } catch (err) {
      console.error("Lỗi download phụ đề:", err);
      setErrorMsg("Không thể tải phụ đề bản này: " + err.message);
    }
  };

  // Apply time offset filter dynamically
  useEffect(() => {
    if (rawSubtitles.length === 0) {
      setSubtitles([]);
      return;
    }

    const shifted = rawSubtitles.map((line) => ({
      ...line,
      startTime: Math.max(0, line.startTime + timeOffset),
      endTime: Math.max(0, line.endTime + timeOffset)
    }));

    setSubtitles(shifted);
  }, [rawSubtitles, timeOffset]);

  // Switch version manually
  const handleVersionChange = async (e) => {
    const versionId = e.target.value;
    setSelectedVersionId(versionId);
    const versionObj = subtitleVersions.find(v => v.id === versionId);
    if (versionObj) {
      setIsLoading(true);
      setErrorMsg("");
      await downloadSubtitle(versionObj);
      setIsLoading(false);
    }
  };

  // Sync player time with list items
  useEffect(() => {
    if (!player || !subtitles || subtitles.length === 0) {
      setActiveId(null);
      return;
    }

    const handleTimeUpdate = () => {
      const time = player.video.currentTime;
      const current = subtitles.find(
        (line) => time >= line.startTime && time <= line.endTime
      );

      if (current) {
        if (current.id !== activeId) {
          setActiveId(current.id);

          if (autoScroll && listContainerRef.current) {
            const activeEl = document.getElementById(`sub-line-${current.id}`);
            if (activeEl) {
              activeEl.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
              });
            }
          }
        }
      } else {
        setActiveId(null);
      }
    };

    player.on("video:timeupdate", handleTimeUpdate);
    return () => player.off("video:timeupdate", handleTimeUpdate);
  }, [player, subtitles, activeId, autoScroll]);

  // Jump playhead when subtitle is clicked
  const handleLineClick = (startTime) => {
    if (player && player.video) {
      player.video.currentTime = startTime;
      player.play().catch(() => { });
    }
  };

  // Search keyword inside loaded subtitles list
  const filteredSubtitles = useMemo(() => {
    if (!searchQuery.trim()) return subtitles;
    const query = searchQuery.toLowerCase().trim();
    return subtitles.filter(
      (line) =>
        line.text.toLowerCase().includes(query) ||
        line.translation.toLowerCase().includes(query)
    );
  }, [subtitles, searchQuery]);

  return (
    <div className="flex flex-col h-[520px] bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      {/* 1. Header Control Panel */}
      <div className="p-4 border-b border-white/5 bg-slate-900/30 space-y-3 shrink-0">

        {/* Title and Overlay eye toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Languages className="size-4 text-emerald-400" />
            <span>Phụ đề gốc OpenSubtitles</span>
          </div>

          <button
            onClick={() => setShowSubtitleOverlay(!showSubtitleOverlay)}
            type="button"
            title={showSubtitleOverlay ? "Ẩn phụ đề trên video" : "Hiển thị phụ đề trên video"}
            className={`p-1.5 rounded-lg border transition ${showSubtitleOverlay
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200"
              }`}
          >
            {showSubtitleOverlay ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </button>
        </div>

        {/* Manual query search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Nhập tên phim tiếng Anh..."
              value={customSearchQuery}
              onChange={(e) => setCustomSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && performSearch(customSearchQuery)}
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <button
            onClick={() => performSearch(customSearchQuery)}
            type="button"
            className="px-3 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl text-xs font-bold transition border border-emerald-500/20"
          >
            Tìm
          </button>
        </div>

        {/* Language selector tabs */}
        <div className="flex p-0.5 bg-slate-950/50 rounded-lg border border-white/5">
          {[
            { key: "zh", label: "Trung 🇨🇳" },
            { key: "en", label: "Anh 🇬🇧" },
            { key: "ja", label: "Nhật 🇯🇵" }
          ].map((lang) => (
            <button
              key={lang.key}
              onClick={() => setSelectedLanguage(lang.key)}
              type="button"
              className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-md transition-all ${selectedLanguage === lang.key
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Subtitle version switcher */}
        {subtitleVersions.length > 1 && !isLoading && (
          <div className="flex items-center justify-between gap-2 bg-slate-950/30 p-1.5 rounded-lg border border-white/5">
            <span className="text-[9px] text-slate-500 font-bold uppercase shrink-0">Bản dịch khác:</span>
            <select
              value={selectedVersionId}
              onChange={handleVersionChange}
              className="bg-transparent text-[10px] text-slate-300 w-full focus:outline-none cursor-pointer text-right"
            >
              {subtitleVersions.map((v) => (
                <option key={v.id} value={v.id} className="bg-slate-950 text-slate-300">
                  {v.fileName.length > 30 ? `${v.fileName.substring(0, 30)}...` : v.fileName} ({v.downloads} lượt tải)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Subtitle Scrolling List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3" ref={listContainerRef}>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-3.5 text-center">
            <div className="size-8 rounded-full border-2 border-white/10 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-xs font-medium">Đang kết nối OpenSubtitles...</p>
          </div>
        ) : errorMsg ? (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-2 text-center">
            <AlertCircle className="size-8 text-amber-500/60" />
            <p className="text-slate-400 text-xs max-w-[240px] leading-relaxed">{errorMsg}</p>
          </div>
        ) : subtitles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <Info className="size-8 text-slate-600 mb-2" />
            <p className="text-slate-500 text-xs">Không có phụ đề gốc.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSubtitles.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Không tìm thấy câu thoại nào khớp từ khóa.
              </div>
            ) : (
              filteredSubtitles.map((line) => {
                const isActive = line.id === activeId;
                return (
                  <div
                    key={line.id}
                    id={`sub-line-${line.id}`}
                    onClick={() => handleLineClick(line.startTime)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-300 relative group overflow-hidden ${isActive
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                      : "bg-slate-900/30 border-white/5 hover:border-white/10 hover:bg-slate-900/50"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-md" />
                    )}

                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono mb-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className={isActive ? "text-emerald-400/80 font-bold" : ""}>
                          {formatTime(line.startTime)}
                        </span>
                        <span>➔</span>
                        <span>{formatTime(line.endTime)}</span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 flex items-center gap-0.5 font-bold">
                        <Play className="size-2.5 fill-emerald-400" />
                        <span>Phát</span>
                      </span>
                    </div>

                    <div className="space-y-1 font-medium select-text whitespace-pre-line">
                      <p className={`text-xs ${isActive ? "text-white font-bold" : "text-slate-200"}`}>
                        {line.text}
                      </p>
                      {line.translation && line.translation !== line.text && (
                        <p className={`text-xs ${isActive ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                          {line.translation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 3. Footer controls: Time Offset Sync */}
      {subtitles.length > 0 && !isLoading && (
        <div className="p-3 bg-slate-900/35 border-t border-white/5 flex flex-col gap-2 shrink-0">
          {/* Time Sync Adjustment (Lệch sub) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock className="size-3 text-emerald-400" />
              <span className="font-bold">Độ trễ sub (Lệch thời gian):</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-white/5">
              <button
                onClick={() => setTimeOffset(prev => prev - 1.5)}
                type="button"
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold"
                title="Sớm hơn 1.5s"
              >
                -1.5s
              </button>
              <button
                onClick={() => setTimeOffset(prev => prev - 0.5)}
                type="button"
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold"
                title="Sớm hơn 0.5s"
              >
                -0.5s
              </button>
              <span className={`px-1.5 font-mono text-[10px] font-bold min-w-[45px] text-center ${timeOffset === 0 ? "text-slate-500" : timeOffset > 0 ? "text-emerald-400" : "text-amber-400"
                }`}>
                {timeOffset === 0 ? "Khớp" : timeOffset > 0 ? `+${timeOffset.toFixed(1)}s` : `${timeOffset.toFixed(1)}s`}
              </span>
              <button
                onClick={() => setTimeOffset(prev => prev + 0.5)}
                type="button"
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold"
                title="Trễ hơn 0.5s"
              >
                +0.5s
              </button>
              <button
                onClick={() => setTimeOffset(prev => prev + 1.5)}
                type="button"
                className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold"
                title="Trễ hơn 1.5s"
              >
                +1.5s
              </button>

              {timeOffset !== 0 && (
                <button
                  onClick={() => setTimeOffset(0)}
                  type="button"
                  className="ml-1 p-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded"
                  title="Đặt lại về 0"
                >
                  <RefreshCw className="size-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-500">
            <span>Bấm vào câu thoại để tua video</span>
            <span>Powered by OpenSubtitles</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchSubtitles;
