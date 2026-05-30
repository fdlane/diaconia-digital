import { describe, expect, it } from "vitest";
import { getApiBaseUrl, getApiUrl, getZeroRuntimeConfig } from "./endpoints";

describe("mobile endpoint config", () => {
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
});
