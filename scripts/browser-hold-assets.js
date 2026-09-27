// Browser-test-only gate: make a resize during GLB loading deterministic.
let release;
const held = new Promise(resolve => { release = resolve; });
const originalFetch = window.fetch.bind(window);
window.__releaseAssetRequests = () => release();
window.fetch = (input, options) => {
  const url = input instanceof Request ? input.url : String(input);
  if (url.includes('/models/')) {
    window.__assetsHeld = true;
    return held.then(() => originalFetch(input, options));
  }
  return originalFetch(input, options);
};
