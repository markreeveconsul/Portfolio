// Shared by the root layout (server) and the boot intro (client). No "use client"
// so the layout can inline the script string.

export const BOOT_STORAGE_KEY = "consul.dev:boot-seen";

/**
 * Runs in <head> before first paint, so the intro overlay never flashes for
 * visitors who won't see it. Plays once per browser session; never for
 * reduced-motion visitors. Any error falls back to "skip".
 * Add ?boot to the URL to force it to play (handy for testing).
 *
 * It also catches a skip (key, click, wheel, touch) that happens before the
 * page's JavaScript has loaded, by setting data-boot-skip on <html>: CSS then
 * hides the overlay right away, and the boot intro honours it when it mounts.
 */
export const bootScript = `(function(){var d=document.documentElement;try{var seen=sessionStorage.getItem(${JSON.stringify(BOOT_STORAGE_KEY)});var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;var force=/[?&]boot(=|&|$)/.test(location.search);var play=force||(!seen&&!reduce);d.setAttribute("data-boot",play?"play":"skip");if(play){var ev=["keydown","pointerdown","wheel","touchstart"];var skip=function(){d.setAttribute("data-boot-skip","1");for(var i=0;i<ev.length;i++)removeEventListener(ev[i],skip,true)};for(var i=0;i<ev.length;i++)addEventListener(ev[i],skip,{capture:true,passive:true})}}catch(e){d.setAttribute("data-boot","skip")}})();`;
