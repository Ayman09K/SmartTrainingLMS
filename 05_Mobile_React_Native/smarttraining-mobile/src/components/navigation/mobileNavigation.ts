import { Href, router } from "expo-router";

/**
 * Returns to the previous screen when a navigation history exists.
 * Direct links and refreshed web routes fall back to a known safe route.
 */
export function navigateBackOrReplace(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
