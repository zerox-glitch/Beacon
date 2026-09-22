/**
 * ESM resolve hook: lets `node --experimental-strip-types` import the repo's
 * extensionless TypeScript imports (Vite style) during harness/test runs.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".tsx") &&
      !specifier.endsWith(".mjs") &&
      !specifier.endsWith(".js")
    ) {
      try {
        return await nextResolve(`${specifier}.ts`, context);
      } catch {
        return await nextResolve(`${specifier}/index.ts`, context);
      }
    }
    throw err;
  }
}
