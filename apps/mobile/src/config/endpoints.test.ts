import { afterEach, describe, expect, it } from "vitest";
import { getApiBaseUrl, getApiUrl, getZeroRuntimeConfig } from "./endpoints";
import { getPublicEnvValue } from "./publicEnv";

describe("mobile endpoint config", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { __DIACONIA_ENV__?: Record<string, string | undefined> }).__DIACONIA_ENV__;
  });

  it("defaults web builds to same-origin API paths", () => {
    expect(getApiBaseUrl({}, "web")).toBe("");
    expect(getApiUrl("/me", {}, "web")).toBe("/me");
    expect(getZeroRuntimeConfig({}, "web")).toEqual({
      cacheUrl: "/zero/cache",
      queryUrl: "/zero/query",
      mutateUrl: "/zero/mutate",
    });
  });

  it("uses explicit server URLs for native platforms", () => {
    expect(getApiBaseUrl({}, "ios")).toBe("http://localhost:4000");
    expect(getApiUrl("/me", {}, "android")).toBe("http://localhost:4000/me");
    expect(getZeroRuntimeConfig({ EXPO_PUBLIC_ZERO_CACHE_URL: "https://zero.example.com/" }, "ios")).toMatchObject({
      cacheUrl: "https://zero.example.com",
      queryUrl: "http://localhost:4000/zero/query",
      mutateUrl: "http://localhost:4000/zero/mutate",
    });
  });

  it("normalizes configured base URLs and paths", () => {
    const env = { EXPO_PUBLIC_API_URL: "https://mobile.example.org///" };
    expect(getApiBaseUrl(env, "web")).toBe("https://mobile.example.org");
    expect(getApiUrl("zero/query", env, "web")).toBe("https://mobile.example.org/zero/query");
  });

  it("falls back to runtime public env when Expo compile-time values are empty", () => {
    (globalThis as typeof globalThis & { __DIACONIA_ENV__?: Record<string, string | undefined> }).__DIACONIA_ENV__ = {
      EXPO_PUBLIC_API_URL: "https://api.example.org",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_runtime",
      NEXT_PUBLIC_CLERK_JWT_TEMPLATE: "diaconia-api",
    };

    expect(getApiBaseUrl({ EXPO_PUBLIC_API_URL: "" }, "web")).toBe("https://api.example.org");
    expect(getApiUrl("/me", { EXPO_PUBLIC_API_URL: "" }, "web")).toBe("https://api.example.org/me");
    expect(getPublicEnvValue("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", {}, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")).toBe(
      "pk_test_runtime",
    );
    expect(getPublicEnvValue("EXPO_PUBLIC_CLERK_JWT_TEMPLATE", {}, "NEXT_PUBLIC_CLERK_JWT_TEMPLATE")).toBe(
      "diaconia-api",
    );
  });
});
