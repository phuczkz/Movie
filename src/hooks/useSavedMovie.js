import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

export const useSavedMovie = (movieOrSlug) => {
	const { user, saveMovie, removeSavedMovie } = useAuth();
	const [isSaved, setIsSaved] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [message, setMessage] = useState("");
	const [lastAction, setLastAction] = useState(null); // 'save' | 'remove'

	const slug = useMemo(() => {
		if (typeof movieOrSlug === "string") return movieOrSlug;
		return movieOrSlug?.slug || null;
	}, [movieOrSlug]);

	useEffect(() => {
		if (!user || !slug || !db) {
			setIsSaved(false);
			return undefined;
		}

		const ref = doc(db, "users", user.uid, "savedMovies", slug);
		const unsubscribe = onSnapshot(
			ref,
			(snapshot) => setIsSaved(snapshot.exists()),
			(err) => {
				setError(err);
				setIsSaved(false);
			}
		);

		return unsubscribe;
	}, [user, slug]);

	const toggleSave = useCallback(async () => {
		if (!slug) {
			setError(new Error("Thiếu thông tin phim."));
			return;
		}
		if (!user) {
			setError(new Error("Bạn cần đăng nhập để thực hiện thao tác này."));
			return;
		}

		setLoading(true);
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
			setLoading(false);
		}
	}, [isSaved, movieOrSlug, removeSavedMovie, saveMovie, slug, user]);

	return { isSaved, loading, error, message, lastAction, toggleSave };
};

export default useSavedMovie;
