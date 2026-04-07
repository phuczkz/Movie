const COMIC_API = import.meta.env.VITE_COMIC_API;

export const comicApi = {
  getHome: async () => {
    const res = await fetch(`${COMIC_API}/home`);
    if (!res.ok) throw new Error("Lỗi tải trang chủ truyện");
    return res.json();
  },
  getList: async (type, page = 1) => {
    const res = await fetch(`${COMIC_API}/danh-sach/${type}?page=${page}`);
    if (!res.ok) throw new Error("Lỗi tải danh sách truyện");
    return res.json();
  },
  getCategoryList: async () => {
    const res = await fetch(`${COMIC_API}/the-loai`);
    if (!res.ok) throw new Error("Lỗi tải danh sách thể loại");
    return res.json();
  },
  getCategory: async (slug, page = 1) => {
    const res = await fetch(`${COMIC_API}/the-loai/${slug}?page=${page}`);
    if (!res.ok) throw new Error("Lỗi tải thể loại");
    return res.json();
  },
  getDetail: async (slug) => {
    const res = await fetch(`${COMIC_API}/truyen-tranh/${slug}`);
    if (!res.ok) throw new Error("Lỗi tải chi tiết truyện");
    return res.json();
  },
  search: async (keyword) => {
    const res = await fetch(`${COMIC_API}/tim-kiem?keyword=${encodeURIComponent(keyword)}`);
    if (!res.ok) throw new Error("Lỗi tìm kiếm truyện");
    return res.json();
  }
};
