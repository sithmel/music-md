/**
 * @fileoverview Remark plugin for converting LilyPond code blocks to inline SVG
 */

import { visit } from "unist-util-visit";
import { render } from "lilynode";

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
function remarkLilypond(options = {}) {
  const {
    binaryPath = "lilypond",
    errorInline = false,
    skipOnMissing = false,
    compact = true,
  } = options;

  /**
   * Transformer function that processes the AST
   * @param {Object} tree - The AST tree
   * @returns {Promise<void>}
   */
  return async function transformer(tree) {
    const codeBlocks = [];

    // Collect all lilypond code blocks
    visit(tree, "code", (node, index, parent) => {
      if (node.lang === "lilypond") {
        codeBlocks.push({ node, index, parent });
      }
    });

    // Skip processing if no LilyPond blocks found
    if (codeBlocks.length === 0) {
      return;
    }

    // Process each code block asynchronously
    for (const { node, index, parent } of codeBlocks) {
      try {
        // Prepare LilyPond code with optional header modifications
        let lilypondCode = node.value;
        if (compact) {
          // Remove tagline and margins, use ragged-right for natural width
          lilypondCode = `\\paper {
            indent = 0
            ragged-right = ##t
            right-margin = 0
            left-margin = 0
          }\n\\header { tagline = "" }\n${lilypondCode}`;
        }

        const svgBuffer = await render(lilypondCode, {
          format: "svg",
          binaryPath,
        });

        // Convert buffer to string
        let svgContent = svgBuffer.toString("utf8");

        // Post-process SVG if compact mode is enabled
        if (compact) {
          svgContent = compactSvg(svgContent);
        }

        // Replace the code block with an image node containing inline SVG
        parent.children[index] = {
          type: "html",
          value: svgContent,
        };
      } catch (error) {
        const errorMessage = parseLilyPondError(error.message);
        console.error("🎵 LilyPond compilation error:", errorMessage);

        if (skipOnMissing && isLilyPondNotFound(error)) {
          console.warn(
            `⚠️  LilyPond executable '${binaryPath}' not found. Skipping LilyPond blocks.`,
          );
          return;
        }

        if (errorInline) {
          // Replace with error message
          const errorHtml = isLilyPondNotFound(error)
            ? `<div class="lilypond-error">
                <strong>LilyPond Not Found:</strong> Please install LilyPond to render musical notation.<br>
                <small>Install from <a href="https://lilypond.org/download.html" target="_blank">lilypond.org</a> or use your package manager.</small>
              </div>`
            : `<div class="lilypond-error">
                <strong>LilyPond Compilation Error:</strong><br>
                <pre>${escapeHtml(errorMessage)}</pre>
              </div>`;

          parent.children[index] = {
            type: "html",
            value: errorHtml,
          };
        }
        // If not inline, keep the original code block and log error
      }
    }
  };
}

/**
 * Compacts an SVG by removing attribution and cropping whitespace
 * @param {string} svgContent - The original SVG content
 * @returns {string} The compacted SVG content
 */
function compactSvg(svgContent) {
  // Remove LilyPond attribution elements
  // Remove <a> tags with lilypond.org links
  svgContent = svgContent.replace(
    /<a[^>]*lilypond\.org[^>]*>[\s\S]*?<\/a>/gi,
    "",
  );

  // Remove text elements containing "Music engraving" or "LilyPond"
  svgContent = svgContent.replace(
    /<text[^>]*>[\s\S]*?(?:Music engraving|LilyPond)[\s\S]*?<\/text>/gi,
    "",
  );

  // Remove <g> groups that only contain attribution
  svgContent = svgContent.replace(
    /<g[^>]*>\s*<(?:a|text)[^>]*(?:lilypond|Music engraving)[\s\S]*?<\/g>/gi,
    "",
  );

  // Try to crop whitespace by analyzing the content bounds
  const svgMatch = svgContent.match(/<svg[^>]*viewBox="([^"]*)"[^>]*>/);
  if (svgMatch) {
    const viewBox = svgMatch[1].split(/\s+/).map(parseFloat);
    if (viewBox.length === 4) {
      const [x, y, width, height] = viewBox;

      // Find actual content bounds by analyzing SVG elements
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      // Parse transform translate values
      const transforms = [
        ...svgContent.matchAll(/transform="translate\(([^)]+)\)"/g),
      ];
      for (const match of transforms) {
        const coords = match[1].split(",").map((s) => parseFloat(s.trim()));
        if (coords.length >= 2) {
          minX = Math.min(minX, coords[0]);
          maxX = Math.max(maxX, coords[0]);
          minY = Math.min(minY, coords[1]);
          maxY = Math.max(maxY, coords[1]);
        }
      }

      // Parse line elements to find actual content width
      const lines = [...svgContent.matchAll(/<line[^>]*x2="([^"]*)"[^>]*>/g)];
      for (const match of lines) {
        const x2 = parseFloat(match[1]);
        if (!isNaN(x2)) {
          maxX = Math.max(maxX, x2);
        }
      }

      // Parse rect elements for their width extent
      const rects = [
        ...svgContent.matchAll(
          /<rect[^>]*x="([^"]*)"[^>]*width="([^"]*)"[^>]*>/g,
        ),
      ];
      for (const match of rects) {
        const x = parseFloat(match[1]) || 0;
        const width = parseFloat(match[2]) || 0;
        maxX = Math.max(maxX, x + width);
      }

      // Parse path elements within g transforms to estimate bounds
      const pathGroups = [
        ...svgContent.matchAll(
          /<g transform="translate\(([^)]+)\)"[^>]*>[\s\S]*?<path[^>]*>/g,
        ),
      ];
      for (const match of pathGroups) {
        const coords = match[1].split(",").map((s) => parseFloat(s.trim()));
        if (coords.length >= 2) {
          // Estimate path width based on typical note widths (rough heuristic)
          maxX = Math.max(maxX, coords[0] + 2);
        }
      }

      if (minX < Infinity && minY < Infinity && maxX > -Infinity) {
        // Add some padding around the content
        const padding = 5;
        const contentX = Math.max(0, minX - padding);
        const contentY = Math.max(0, minY - padding);
        const contentWidth = maxX - minX + 2 * padding;
        const contentHeight = maxY - minY + 2 * padding;

        // Update the viewBox and dimensions
        const newViewBox = `${contentX} ${contentY} ${contentWidth} ${contentHeight}`;
        svgContent = svgContent.replace(
          /(<svg[^>]*viewBox=")[^"]*(")/,
          `$1${newViewBox}$2`,
        );

        // Update width to 100% and height to match content proportionally
        svgContent = svgContent.replace(
          /(<svg[^>]*)width="[^"]*"/,
          `$1width="100%"`,
        );
        svgContent = svgContent.replace(
          /(<svg[^>]*)height="[^"]*"/,
          `$1height="${contentHeight.toFixed(2)}"`,
        );
      }
    }
  }

  return svgContent;
}

/**
 * Checks if the error indicates LilyPond is not found
 * @param {Error} error - The error object
 * @returns {boolean} True if LilyPond is not found
 */
function isLilyPondNotFound(error) {
  return (
    error.message.includes("not found") ||
    error.message.includes("ENOENT") ||
    error.code === "ENOENT"
  );
}

/**
 * Parses LilyPond error messages to extract useful information
 * @param {string} errorMessage - Raw error message
 * @returns {string} Cleaned error message
 */
function parseLilyPondError(errorMessage) {
  if (errorMessage.includes("not found") || errorMessage.includes("ENOENT")) {
    return "LilyPond executable not found in PATH";
  }

  // Extract meaningful error lines from LilyPond output
  const lines = errorMessage.split("\n");
  const errorLines = lines.filter(
    (line) =>
      line.includes("error:") ||
      line.includes("warning:") ||
      line.includes("programming error:") ||
      line.includes("fatal error:"),
  );

  if (errorLines.length > 0) {
    return errorLines.join("\n");
  }

  return errorMessage;
}

/**
 * Escapes HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default remarkLilypond;
