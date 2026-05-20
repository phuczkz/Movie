import { useState, useEffect } from "react";
import { collection, getDocs, getCountFromServer, collectionGroup } from "firebase/firestore";
import { db } from "../../firebase.config";
import {
  LayoutDashboard,
  Users,
  Activity,
  MessageSquare,
  Film,
  TrendingUp,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalViews: 0,
    totalUniqueRequests: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch Users count efficiently
        const usersCol = collection(db, "users");
        const usersSnapshot = await getCountFromServer(usersCol);
        const totalUsers = usersSnapshot.data().count;

        // Fetch Comments count efficiently (use collectionGroup to count individual comments)
        const commentsCol = collectionGroup(db, "items");
        const commentsSnapshot = await getCountFromServer(commentsCol);
        const totalComments = commentsSnapshot.data().count;

        // Fetch Movie Views
        const viewsSnap = await getDocs(collection(db, "movieViews"));
        let totalViews = 0;
        let totalUniqueRequests = 0;
        const allMovies = [];
        viewsSnap.forEach((doc) => {
          const data = doc.data();
          totalViews += (data.views || 0);
          totalUniqueRequests += (data.userIds ? data.userIds.length : 0);
          allMovies.push({ id: doc.id, ...data });
        });

        allMovies.sort((a, b) => {
          const aCount = a.userIds ? a.userIds.length : 0;
          const bCount = b.userIds ? b.userIds.length : 0;
          if (bCount === aCount) return (b.views || 0) - (a.views || 0);
          return bCount - aCount;
        });

        const topMovies = allMovies.slice(0, 5);

        setStats({
          totalUsers,
          totalViews,
          totalUniqueRequests,
          totalComments,
          topMovies,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="loader-orbit loader-orbit-md opacity-50" />
      </div>
    );
  }

  const statCards = [
    {
      title: "Tổng số User",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Tổng số lượng yêu cầu",
      value: stats.totalUniqueRequests.toLocaleString(),
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Tổng lượt xem (Views)",
      value: stats.totalViews.toLocaleString(),
      icon: Film,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      title: "Tổng bình luận",
      value: stats.totalComments.toLocaleString(),
      icon: MessageSquare,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
          <LayoutDashboard className="text-indigo-500 size-6" />
          Tổng quan Dashboard
        </h2>
        <p className="text-slate-400 text-sm">
          Cái nhìn tổng thể về hoạt động của hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 flex flex-col gap-4 relative overflow-hidden group"
          >
            <div className={`absolute -right-6 -top-6 size-24 rounded-full ${card.bg} blur-2xl group-hover:blur-3xl transition-all duration-500`} />
            
            <div className={`size-12 rounded-2xl ${card.bg} ${card.border} border flex items-center justify-center shrink-0`}>
              <card.icon className={`size-6 ${card.color}`} />
            </div>
            
            <div className="space-y-1">
              <p className="text-slate-400 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-black text-white tabular-nums tracking-tight">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Biểu đồ Top 5 phim (User Request) */}
      <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 lg:p-8 mt-8">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
          <Film className="size-5 text-emerald-500" />
          Biểu đồ Top 5 phim được nhiều User xem nhất
        </h3>
        
        {stats.topMovies && stats.topMovies.length > 0 ? (
          <div className="space-y-6">
            {stats.topMovies.map((movie) => {
              const maxUsers = stats.topMovies[0]?.userIds?.length || 1;
              const userCount = movie.userIds ? movie.userIds.length : 0;
              const percentage = Math.max(2, (userCount / maxUsers) * 100);

              return (
                <div key={movie.id} className="space-y-2 group">
                  <div className="flex justify-between items-end text-sm">
                    <span className="font-semibold text-slate-200 line-clamp-1 group-hover:text-emerald-400 transition-colors">{movie.name}</span>
                    <span className="text-emerald-400 font-black tabular-nums">{userCount} <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Users</span></span>
                  </div>
                  <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${percentage}%` }}
                    >
                       <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-sm">
             Chưa có dữ liệu người xem.
          </div>
        )}
      </div>
      
      <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-8 mt-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <TrendingUp className="size-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Chào mừng tới trang quản trị</h3>
            <p className="text-slate-400 text-sm">Quản lý và theo dõi toàn bộ hệ thống từ đây.</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">
          Bạn có thể truy cập các tab bên trái để quản lý báo cáo chi tiết, danh sách người dùng, bình luận, trạng thái phim, hoặc chế độ bảo trì của hệ thống.
        </p>
      </div>
    </div>
  );
}
