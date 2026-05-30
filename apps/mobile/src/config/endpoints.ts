type PublicEnv = Record<string, string | undefined>;
type PlatformOS = "ios" | "android" | "web" | string;

const nativeDevelopmentApiUrl = "http://localhost:4000";
const nativeDevelopmentZeroCacheUrl = "http://localhost:4848";

export function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "/") return "";
  return trimmed.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiBaseUrl(env: PublicEnv = process.env, platform: PlatformOS = "web") {
  if (env.EXPO_PUBLIC_API_URL !== undefined) {
    return normalizeBaseUrl(env.EXPO_PUBLIC_API_URL);
  }

  return platform === "web" ? "" : nativeDevelopmentApiUrl;
}

export function getApiUrl(path: string, env: PublicEnv = process.env, platform: PlatformOS = "web") {
  const apiBaseUrl = getApiBaseUrl(env, platform);
  const normalizedPath = normalizePath(path);
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export type ZeroRuntimeConfig = {
  cacheUrl: string;
  queryUrl: string;
  mutateUrl: string;
};

export function getZeroRuntimeConfig(env: PublicEnv = process.env, platform: PlatformOS = "web"): ZeroRuntimeConfig {
  const configuredCacheUrl = normalizeBaseUrl(env.EXPO_PUBLIC_ZERO_CACHE_URL);
  const defaultCacheUrl = platform === "web" ? getApiUrl("/zero/cache", env, platform) : nativeDevelopmentZeroCacheUrl;

  return {
    cacheUrl: configuredCacheUrl || defaultCacheUrl,
    queryUrl: getApiUrl("/zero/query", env, platform),
    mutateUrl: getApiUrl("/zero/mutate", env, platform),
  };
}
