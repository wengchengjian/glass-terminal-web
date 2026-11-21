/**
 * GLASS Quant Terminal · Frontend Runtime Configuration
 *
 * - demoMode: true  -> Runs fully standalone in the browser with realistic synthetic
 *                      market data (ideal for GitHub Pages & UI/UX evaluation).
 * - demoMode: false -> Connects to your private GLASS backend API at `apiBase`.
 */
window.GLASS_CONFIG = {
  apiBase: '',
  demoMode: true,
}
