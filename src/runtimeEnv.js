export function getRuntimeEnv(key) {
  const runtimeEnv =
    typeof window !== 'undefined' && window.__TURNTABLED_ENV__
      ? window.__TURNTABLED_ENV__
      : {}

  return import.meta.env?.[key] || runtimeEnv[key] || ''
}
