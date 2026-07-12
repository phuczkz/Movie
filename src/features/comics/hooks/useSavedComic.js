import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from '@/firebase.config.js';
import { useAuth } from '@/features/auth/context/AuthContext.jsx';

export const useSavedComic = (comicOrSlug) => {
	const { user, saveComic, removeSavedComic } = useAuth();
	const [isSaved, setIsSaved] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [message, setMessage] = useState("");
	const [lastAction, setLastAction] = useState(null); // 'save' | 'remove'

	const slug = useMemo(() => {
		if (typeof comicOrSlug === "string") return comicOrSlug;
		return comicOrSlug?.slug || null;
	}, [comicOrSlug]);

	useEffect(() => {
		if (!user || !slug || !db) {
			setIsSaved(false);
			return undefined;
		}

		const ref = doc(db, "users", user.uid, "FavoriteComics", slug);
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

	const toggleSave = useCallback(async (passedComic) => {
		if (!slug) {
			setError(new Error("Thiếu thông tin truyện."));
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
				await removeSavedComic(slug);
				setMessage("Đã bỏ khỏi Yêu thích.");
				setLastAction("remove");
			} else {
				// Prioritize passedComic, then comicOrSlug if it's an object, then fallback to {slug}
				const payload = 
					passedComic || 
					(typeof comicOrSlug === "object" ? comicOrSlug : { slug });
				
				await saveComic(payload);
				setMessage("Đã thêm vào Yêu thích.");
				setLastAction("save");
			}
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	}, [isSaved, comicOrSlug, removeSavedComic, saveComic, slug, user]);

	return { isSaved, loading, error, message, lastAction, toggleSave };
};

export default useSavedComic;
