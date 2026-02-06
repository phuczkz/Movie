import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_MOVIE_API || "",
  timeout: 15000,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default client;
