import { useEffect } from "react";

/**
 * Marks the current page as private: injects noindex + no-referrer meta tags
 * into <head> and opts out of posthog capture if the public script is on the page.
 * Tags are removed on unmount so navigating back to a public page restores default behaviour.
 */
export function usePrivatePage() {
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", "noindex, nofollow");
    robots.setAttribute("data-private-page", "1");

    const ref = document.createElement("meta");
    ref.setAttribute("name", "referrer");
    ref.setAttribute("content", "no-referrer");
    ref.setAttribute("data-private-page", "1");

    document.head.appendChild(robots);
    document.head.appendChild(ref);

    try {
      // Hard opt-out for private pages even if the public bootstrap already ran.
      if (window.posthog) {
        window.posthog.opt_out_capturing?.();
        window.posthog.stopSessionRecording?.();
      }
    } catch (e) {
      /* no-op */
    }

    return () => {
      robots.remove();
      ref.remove();
    };
  }, []);
}
