import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { comicApi } from "../../api/comicApi";
import ComicCard from "../../components/comics/ComicCard";
import Pagination from "../../components/Pagination";
import { ListIcon, LayoutGrid } from "lucide-react";

const listLabels = {
  "dang-phat-hanh": "Truyện Đang Phát Hành",
  "hoan-thanh": "Truyện Đã Hoàn Thành",
  "sap-ra-mat": "Truyện Sắp Ra Mắt",
  "truyen-moi": "Truyện Mới Cập Nhật",
};

export default function ComicList() {
  const { type, slug, page: pageParam } = useParams();
  const navigate = useNavigate();
  const page = Math.max(1, Number(pageParam) || 1);

  // Xác định xem đang xem theo danh sách hay thể loại
  const isCategory = !!slug;
  const currentSlug = isCategory ? slug : type;

  const { data, isLoading, error } = useQuery({
    queryKey: ["comics", isCategory ? "the-loai" : "danh-sach", currentSlug, page],
    queryFn: () => isCategory 
      ? comicApi.getCategory(currentSlug, page) 
      : comicApi.getList(currentSlug, page),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const heading = useMemo(() => {
    if (isCategory) {
      return data?.data?.titlePage || `Thể loại: ${currentSlug}`;
    }
    return listLabels[currentSlug] || "Danh sách truyện";
  }, [isCategory, currentSlug, data]);

  const items = data?.data?.items || [];
  const pagination = data?.data?.params?.pagination;
  const totalItems = pagination?.totalItems || 0;
  const itemsPerPage = pagination?.totalItemsPerPage || 24;
  const totalPages = pagination?.totalPages || Math.ceil(totalItems / itemsPerPage);
  const hasNext = totalPages > page;

  const handlePageChange = (newPage) => {
    const basePath = isCategory ? `/comics/the-loai/${slug}` : `/comics/danh-sach/${type}`;
    navigate(`${basePath}${newPage > 1 ? `/${newPage}` : ""}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="loader-orbit" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg font-medium">Có lỗi xảy ra khi tải danh sách truyện.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
            {isCategory ? (
              <LayoutGrid className="w-6 h-6 text-purple-500" />
            ) : (
              <ListIcon className="w-6 h-6 text-purple-500" />
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              {heading}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Trang {page} {data?.data?.params?.pagination?.totalItems ? `• Tổng cộng ${data.data.params.pagination.totalItems} truyện` : ""}
            </p>
          </div>
        </div>
      </header>

      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 xl:gap-6">
            {items.map((comic) => (
              <ComicCard key={comic._id} comic={comic} />
            ))}
          </div>

          <Pagination 
            currentPage={page}
            hasNext={hasNext}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="min-h-[40vh] flex items-center justify-center bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
          <p className="text-slate-500 font-medium">Không tìm thấy truyện nào trong danh sách này.</p>
        </div>
      )}
    </div>
  );
}
