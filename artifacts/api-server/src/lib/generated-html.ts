/**
 * Generated landing pages are served from the app's own origin, where signed-in
 * users keep their session token. The CSP sandbox directive gives each generated
 * document an opaque origin, so its markup cannot read that token or call the API
 * with the visitor's session, even when it is opened directly in a tab.
 */
export const GENERATED_HTML_SANDBOX = "sandbox allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox";

/**
 * Sandboxed pages send `Origin: null`. Only these anonymous endpoints, which a
 * generated page calls for form submissions and A/B conversion beacons, accept it.
 */
export const GENERATED_PAGE_ENDPOINTS = /^\/api\/(public\/ab-tests\/[^/]+\/convert|(landing-pages|pages)\/[^/]+\/submit)\/?$/i;
