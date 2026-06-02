import axios from "axios";

// ── Request cancellation system ──
// Tracks all in-flight requests so they can be cancelled on route change.
// This prevents stale requests from clogging the network when navigating.
let _pendingControllers = new Set();

const client = axios.create({
  baseURL: import.meta.env.VITE_MOVIE_API || "",
  timeout: 8000,
});

// Automatically attach AbortController to every request
client.interceptors.request.use((config) => {
  // Don't override if caller already provided a signal (e.g. getDetail)
  if (!config.signal) {
    const controller = new AbortController();
    config.signal = controller.signal;
    config._abortController = controller;
    _pendingControllers.add(controller);

    // Clean up when request finishes (success or error)
    const cleanup = () => _pendingControllers.delete(controller);
    config._cleanup = cleanup;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.config._abortController) {
      _pendingControllers.delete(response.config._abortController);
    }
    return response;
  },
  (error) => {
    if (error.config?._abortController) {
      _pendingControllers.delete(error.config._abortController);
    }
    // Don't treat cancellation as an error
    if (axios.isCancel(error) || error.name === "CanceledError" || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }
    const message =
      error?.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

/**
 * Cancel all pending API requests.
 * Call this on route change to free up network connections.
 */
export const cancelAllPendingRequests = () => {
  _pendingControllers.forEach((controller) => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  });
  _pendingControllers.clear();
};

export default client;
