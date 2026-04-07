import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { comicApi } from "../../api/comicApi";
import { Flame } from "lucide-react";
import ComicCard from "../../components/comics/ComicCard";
import Pagination from "../../components/Pagination";

export default function ComicHome() {
  const { page: pageParam } = useParams();
  const navigate = useNavigate();
  const page = Math.max(1, Number(pageParam) || 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["comicHome", page],
    // Sử dụng getList với slug 'truyen-moi' để có dữ liệu phân trang thay vì getHome
    queryFn: () => comicApi.getList("truyen-moi", page),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="loader-orbit" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-red-400">Có lỗi xảy ra khi tải dữ liệu MangaHub.</p>
      </div>
    );
  }

  const items = data?.data?.items || [];
  const pagination = data?.data?.params?.pagination;
  const totalItems = pagination?.totalItems || 0;
  const itemsPerPage = pagination?.totalItemsPerPage || 20;
  const totalPages = pagination?.totalPages || Math.ceil(totalItems / itemsPerPage);
  const hasNext = totalPages > page;

  const handlePageChange = (newPage) => {
    navigate(newPage === 1 ? "/comics" : `/comics/page/${newPage}`);
  };

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-500">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl md:text-3xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Truyện Mới Cập Nhật
            </h1>
          </div>
          {data?.data?.params?.pagination?.totalItems && (
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
              {data.data.params.pagination.totalItems} truyện
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 xl:gap-6">
          {items.map((comic) => (
            <ComicCard key={comic._id} comic={comic} />
          ))}
        </div>

        {(hasNext || page > 1) && (
          <Pagination 
            currentPage={page}
            hasNext={hasNext}
            onPageChange={handlePageChange}
          />
        )}
      </section>
    </div>
  );
}
