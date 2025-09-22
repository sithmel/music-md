/**
 * Cleanup function to close browser instance
 * @returns {Promise<void>}
 */
export function closeBrowser(): Promise<void>;
export default remarkSvguitar;
export type SVGuitarOptions = {
  /**
   * - Whether to display errors inline or log to console
   */
  errorInline?: boolean;
  /**
   * - Skip processing if Puppeteer fails to launch
   */
  skipOnMissing?: boolean;
  /**
   * - Options to pass to puppeteer.launch()
   */
  puppeteerOptions?: any;
  /**
   * - Default configuration options for SVGuitar rendering
   */
  SVGuitarConfig?: import("svguitar").ChordSettings;
  /**
   * - Keep the Puppeteer browser open between processor runs for performance
   */
  keepAlive?: boolean;
};
/**
 * Remark plugin to transform SVGuitar code blocks into inline SVG images
 * @param {SVGuitarOptions} [options={}] - Plugin configuration options
 * @returns {(tree: import('unist').Node) => Promise<void>} Unified transformer
 */
declare function remarkSvguitar(
  options?: SVGuitarOptions,
): (tree: import("unist").Node) => Promise<void>;
