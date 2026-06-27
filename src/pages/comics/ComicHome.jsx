import { useQuery, keepPreviousData } from "@tanstack/react-query";
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
    queryFn: async () => {
      // Fetch 1 API page (24 items) which results in roughly 3-4 rows of comics on desktop
      const pagesToFetch = 1;
      const startPage = (page - 1) * pagesToFetch + 1;
      
      const responses = await Promise.allSettled(
        Array.from({ length: pagesToFetch }, (_, i) => 
          comicApi.getList("truyen-moi", startPage + i)
        )
      );

      const items = [];
      let totalPagesApi = 0;
      let totalItemsApi = 0;

      responses.forEach((res, idx) => {
        if (res.status === "fulfilled" && res.value?.data) {
          const pageItems = res.value.data.items || [];
          items.push(...pageItems);
          if (idx === 0) {
            totalItemsApi = res.value.data.params?.pagination?.totalItems || 0;
            const itemsPerPage = res.value.data.params?.pagination?.totalItemsPerPage || 24;
            totalPagesApi = Math.ceil(totalItemsApi / itemsPerPage);
          }
        }
      });

      // Filter: Only include comics that have actual chapters
      const filteredItems = items.filter(
        (comic) => comic.chaptersLatest && comic.chaptersLatest.length > 0
      );

      return {
        data: {
          items: filteredItems,
          params: {
            pagination: {
              totalItems: totalItemsApi,
              totalPages: Math.ceil(totalPagesApi / pagesToFetch),
            },
          },
        },
      };
    },
    placeholderData: keepPreviousData,
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
  const totalPages = pagination?.totalPages || 1;
  const hasNext = totalPages > page;

  const handlePageChange = (newPage) => {
    navigate(newPage === 1 ? "/comics" : `/comics/page/${newPage}`);
  };

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-500">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="size-8 text-purple-500" />
            <h1 className="text-2xl md:text-3xl font-semibold uppercase text-white">
              Truyện Mới Cập Nhật
            </h1>
          </div>
          {data?.data?.params?.pagination?.totalItems && (
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
              {data.data.params.pagination.totalItems} truyện
            </span>
          )}
        </div>
        
        <div className="grid-movies">
          {items.map((comic, idx) => (
            <ComicCard key={comic._id} comic={comic} priority={idx < 6} />
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
