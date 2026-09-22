import { useCallback, useMemo, useState } from "react";
import { useAuth } from '@/features/auth/context/AuthContext.jsx';

export const useSavedMovie = (movieOrSlug) => {
	const { user, saveMovie, removeSavedMovie, savedMovieSlugs, savedMoviesLoaded } = useAuth();
	const [actionLoading, setActionLoading] = useState(false);
	const [error, setError] = useState(null);
	const [message, setMessage] = useState("");
	const [lastAction, setLastAction] = useState(null); // 'save' | 'remove'

	const slug = useMemo(() => {
		if (typeof movieOrSlug === "string") return movieOrSlug;
		return movieOrSlug?.slug || null;
	}, [movieOrSlug]);

	const isSaved = useMemo(() => {
		if (!user || !slug || !savedMovieSlugs) return false;
		return savedMovieSlugs.has(slug);
	}, [user, slug, savedMovieSlugs]);

	const loading = actionLoading || (Boolean(user) && !savedMoviesLoaded);

	const toggleSave = useCallback(async () => {
		if (!slug) {
			setError(new Error("Thiếu thông tin phim."));
			return;
		}
		if (!user) {
			setError(new Error("Bạn cần đăng nhập để thực hiện thao tác này."));
			return;
		}

		setActionLoading(true);
		setError(null);
		setMessage("");
		try {
			if (isSaved) {
				await removeSavedMovie(slug);
				setMessage("Đã bỏ khỏi Yêu thích.");
				setLastAction("remove");
			} else {
				const payload =
					typeof movieOrSlug === "string"
						? { slug }
						: movieOrSlug || { slug };
				await saveMovie(payload);
				setMessage("Đã thêm vào Yêu thích.");
				setLastAction("save");
			}
		} catch (err) {
			setError(err);
		} finally {
			setActionLoading(false);
		}
	}, [isSaved, movieOrSlug, removeSavedMovie, saveMovie, slug, user]);

	return { isSaved, loading, error, message, lastAction, toggleSave };
};

export default useSavedMovie;
