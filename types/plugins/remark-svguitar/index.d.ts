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
};
/**
 * Remark plugin to transform SVGuitar code blocks into inline SVG images
 * @param {SVGuitarOptions} [options={}] - Plugin configuration options
 * @returns {Function} The transformer function
 */
declare function remarkSvguitar(options?: SVGuitarOptions): Function;
