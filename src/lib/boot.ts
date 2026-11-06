// Shared by the root layout (server) and the boot intro (client). No "use client"
// so the layout can inline the script string.

export const BOOT_STORAGE_KEY = "consul.dev:boot-seen";

/**
 * Runs in <head> before first paint, so the intro overlay never flashes for
 * visitors who won't see it. Plays once per browser session; never for
 * reduced-motion visitors. Any error falls back to "skip".
 */
export const bootScript = `(function(){var d=document.documentElement;try{var seen=sessionStorage.getItem(${JSON.stringify(BOOT_STORAGE_KEY)});var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;d.setAttribute("data-boot",seen||reduce?"skip":"play")}catch(e){d.setAttribute("data-boot","skip")}})();`;
