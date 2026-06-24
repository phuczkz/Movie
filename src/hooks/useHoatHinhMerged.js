import { useQuery } from "@tanstack/react-query";
import { getOphimHoatHinh } from "../api/movies";
import { getKKphimHoatHinh } from "../api/movies2";

const parseEpisodeNumber = (value) => {
  if (!value) return 0;
  // Xử lý các chuỗi như "Tập 12" hay "12/24"
  const match = String(value).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

export const useHoatHinhMerged = (page = 1, options = {}) => {
  const { country = "", year = "", movieType = "", ...queryOptions } = options;
  return useQuery({
    queryKey: ["hoat-hinh-merged", page, country, year, movieType],
    queryFn: async () => {
      const extraParams = {};
      if (country) extraParams.country = country;
      if (year) extraParams.year = year;
      if (movieType) extraParams.type = movieType;
      
      // Chạy song song 2 API để lấy danh sách phim hoạt hình
      const [ophimRes, kkphimRes] = await Promise.all([
        getOphimHoatHinh(page, extraParams).catch(() => []),
        getKKphimHoatHinh(page, extraParams).catch(() => []),
      ]);
      
      const map = new Map();
      
      // 1. Thêm KKphim vào map trước (ưu tiên KKphim làm base data)
      (kkphimRes || []).forEach(movie => {
        if (movie && movie.slug) {
          map.set(movie.slug, movie);
        }
      });
      
      // 2. Trộn Ophim vào map
      (ophimRes || []).forEach(movie => {
        if (!movie || !movie.slug) return;
        const existing = map.get(movie.slug);
        
        if (existing) {
          // Phim có ở cả 2 nguồn: So sánh số tập để hiển thị
          const epExisting = parseEpisodeNumber(existing.episode_current) || parseEpisodeNumber(existing.episode_total) || 0;
          const epNew = parseEpisodeNumber(movie.episode_current) || parseEpisodeNumber(movie.episode_total) || 0;
          
          if (epNew > epExisting) {
            // Cập nhật số tập của Ophim nếu nó lớn hơn KKphim
            map.set(movie.slug, {
              ...existing,
              episode_current: movie.episode_current,
              episode_total: movie.episode_total || existing.episode_total
            });
          }
        } else {
          // Phim chỉ có ở Ophim
          map.set(movie.slug, movie);
        }
      });
      
      return Array.from(map.values());
    },
    ...queryOptions,
  });
};
