export type PublicEnv = Record<string, string | undefined>;

const compileTimePublicEnv: PublicEnv = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_AUTH_DEV_BYPASS: process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS,
  EXPO_PUBLIC_CLERK_JWT_TEMPLATE: process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  EXPO_PUBLIC_ZERO_CACHE_URL: process.env.EXPO_PUBLIC_ZERO_CACHE_URL,
};

export function getRuntimePublicEnv() {
  return (globalThis as typeof globalThis & {
    __DIACONIA_ENV__?: PublicEnv;
  }).__DIACONIA_ENV__;
}

export function getPublicEnvValue(name: string, env: PublicEnv = process.env, ...fallbackNames: string[]) {
  const runtimeEnv = getRuntimePublicEnv();

  for (const candidate of [name, ...fallbackNames]) {
    const value = env[candidate] || runtimeEnv?.[candidate] || compileTimePublicEnv[candidate];
    if (value) return value;
  }

  return undefined;
}

export function getEffectivePublicEnv(env: PublicEnv = process.env): PublicEnv {
  return {
    ...getRuntimePublicEnv(),
    ...env,
    EXPO_PUBLIC_API_URL: getPublicEnvValue("EXPO_PUBLIC_API_URL", env, "NEXT_PUBLIC_API_URL"),
    EXPO_PUBLIC_ZERO_CACHE_URL: getPublicEnvValue("EXPO_PUBLIC_ZERO_CACHE_URL", env),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: getPublicEnvValue(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
      env,
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_PUBLISHABLE_KEY",
    ),
    EXPO_PUBLIC_CLERK_JWT_TEMPLATE:
      getPublicEnvValue("EXPO_PUBLIC_CLERK_JWT_TEMPLATE", env, "NEXT_PUBLIC_CLERK_JWT_TEMPLATE") ?? "diaconia-api",
  };
}
