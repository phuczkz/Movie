import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.config";
import { useAuth } from "../context/AuthContext.jsx";

export const useSavedComicsList = () => {
	const { user } = useAuth();
	const [prevUserId, setPrevUserId] = useState(user?.uid);
	const [comics, setComics] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Adjust state during render when user changes
	if (user?.uid !== prevUserId) {
		setPrevUserId(user?.uid);
		if (user) {
			setLoading(true);
			setComics([]);
		} else {
			setLoading(false);
			setComics([]);
		}
	}

	useEffect(() => {
		if (!user || !db) {
			return undefined;
		}

		const ref = collection(db, "users", user.uid, "FavoriteComics");
		const q = query(ref, orderBy("createdAt", "desc"));
		
		const unsubscribe = onSnapshot(
			q,
			(snapshot) => {
				const list = snapshot.docs.map((doc) => ({
					...doc.data(),
					id: doc.id,
				}));
				setComics(list);
				setLoading(false);
			},
			(err) => {
				console.error("Fetch saved comics error:", err);
				setError(err);
				setLoading(false);
			}
		);

		return unsubscribe;
	}, [user]);

	return { comics, loading, error };
};

export default useSavedComicsList;
