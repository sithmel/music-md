export default remarkLilypond;
export type LilyPondOptions = {
    /**
     * - Path to the LilyPond executable
     */
    binaryPath?: string;
    /**
     * - Whether to display errors inline or log to console
     */
    errorInline?: boolean;
    /**
     * - Skip processing if LilyPond is not available
     */
    skipOnMissing?: boolean;
    /**
     * - Remove tagline and crop whitespace from SVG output
     */
    compact?: boolean;
};
/**
 * @typedef {Object} LilyPondOptions
 * @property {string} [binaryPath='lilypond'] - Path to the LilyPond executable
 * @property {boolean} [errorInline=false] - Whether to display errors inline or log to console
 * @property {boolean} [skipOnMissing=false] - Skip processing if LilyPond is not available
 * @property {boolean} [compact=true] - Remove tagline and crop whitespace from SVG output
 */
/**
 * Remark plugin to transform LilyPond code blocks into inline SVG images
 * @param {LilyPondOptions} [options={}] - Plugin configuration options
 * @returns {Function} The transformer function
 */
declare function remarkLilypond(options?: LilyPondOptions): Function;
