import { STREAM_PROXY, FALLBACK_PROXY, stripAdSegmentsFromPlaylist } from "../../utils/hlsUtils";

/**
 * Builds an HLS.js custom loader class that implements proxying and ad-stripping.
 * This is the core "blockADS" logic.
 */
export const buildAdFreeLoader = (BaseLoader, effectiveSource) => {
  if (!BaseLoader) return null;

  const PROXY_CHAIN = [
    ...(STREAM_PROXY ? [STREAM_PROXY] : []),
    ...(FALLBACK_PROXY && FALLBACK_PROXY !== STREAM_PROXY ? [FALLBACK_PROXY] : []),
  ];

  const domainFailedProxies = new Map();
  const urlFailedProxies = new Map();

  const getBestProxy = (origin) => {
    const domainFailed = origin ? domainFailedProxies.get(origin) : null;
    for (const proxy of PROXY_CHAIN) {
      if (domainFailed && domainFailed.has(proxy)) continue;
      return proxy;
    }
    return null;
  };

  const markProxyFailed = (origin, proxyBase) => {
    if (!origin) return;
    if (!domainFailedProxies.has(origin)) domainFailedProxies.set(origin, new Set());
    domainFailedProxies.get(origin).add(proxyBase);
  };

  return class AdFreeLoader extends BaseLoader {
    load(context, config, callbacks) {
      const originalUrl = context.url;
      let originalOrigin = null;
      try {
        if (originalUrl) originalOrigin = new URL(originalUrl).origin;
      } catch { /* ignore */ }

      // Only proxy manifests and levels by default. 
      // Fragments (TS) are bypassed to avoid buffering latency, unless direct fetch fails.
      const isManifestOrLevel = context.type === "manifest" || context.type === "level";
      let activeProxy = null;
      const alreadyProxied = PROXY_CHAIN.some((p) => context.url.includes(p));

      if (!alreadyProxied && context.url && isManifestOrLevel) {
        activeProxy = getBestProxy(originalOrigin);
        if (activeProxy) {
          context.url = `${activeProxy}?url=${encodeURIComponent(context.url)}`;
        }
      }

      const onSuccess = callbacks?.onSuccess;
      const onError = callbacks?.onError;
      const wrappedCallbacks = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          let nextResponse = response;
          if (
            typeof response?.data === "string" &&
            (ctx?.type === "manifest" || ctx?.type === "level")
          ) {
            try {
              const filtered = stripAdSegmentsFromPlaylist(
                response.data,
                response.url || ctx?.url || effectiveSource
              );
              if (
                typeof filtered === "string" &&
                filtered.includes("#EXTM3U") &&
                filtered.includes("#EXTINF")
              ) {
                nextResponse = { ...response, data: filtered };
              }
            } catch { /* Ignore malformed ad-filtering input */ }
          }
          if (onSuccess) onSuccess(nextResponse, stats, ctx, networkDetails);
        },
        onError: (error, ctx, networkDetails, stats) => {
          // If direct fragment fetch failed, try fallback to proxy
          if (!isManifestOrLevel && !activeProxy && !alreadyProxied && originalUrl) {
            const fallbackProxy = getBestProxy(originalOrigin);
            if (fallbackProxy) {
              console.debug(`[HLS] Direct fragment failed, retrying via proxy fallback.`);
              try { this.abort(); } catch { /* ignore */ }
              const retryLoader = new (this.constructor)(config);
              const retryContext = { ...context, url: `${fallbackProxy}?url=${encodeURIComponent(originalUrl)}` };
              retryLoader.load(retryContext, config, wrappedCallbacks);
              return;
            }
          }

          if (activeProxy && originalUrl) {
            markProxyFailed(originalOrigin, activeProxy);
            const nextProxy = getBestProxy(originalOrigin);

            if (nextProxy && nextProxy !== activeProxy) {
              console.debug(`[HLS] Primary proxy failed for ${originalOrigin}, trying secondary.`);
              try { this.abort(); } catch { /* ignore */ }
              const retryLoader = new (this.constructor)(config);
              const retryContext = { ...context, url: `${nextProxy}?url=${encodeURIComponent(originalUrl)}` };
              retryLoader.load(retryContext, config, wrappedCallbacks);
              return;
            }

            const urlFailed = urlFailedProxies.get(originalUrl);
            if (!urlFailed || !urlFailed.has("direct")) {
              console.debug(`[HLS] All proxies failed for ${originalOrigin}, trying direct.`);
              if (!urlFailedProxies.has(originalUrl)) urlFailedProxies.set(originalUrl, new Set());
              urlFailedProxies.get(originalUrl).add("direct");
              try { this.abort(); } catch { /* ignore */ }
              const directLoader = new (this.constructor)(config);
              const directContext = { ...context, url: originalUrl };
              directLoader.load(directContext, config, wrappedCallbacks);
              return;
            }
          }
          if (onError) onError(error, ctx, networkDetails, stats);
        },
      };
      super.load(context, config, wrappedCallbacks);
    }
  };
};
