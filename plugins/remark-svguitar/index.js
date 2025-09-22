//@ts-check
/**
 * @fileoverview Remark plugin for converting SVGuitar code blocks to inline SVG
 */

import { visit } from "unist-util-visit";
import puppeteer from "puppeteer";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @typedef {Object} SVGuitarOptions
 * @property {boolean} [errorInline=false] - Whether to display errors inline or log to console
 * @property {boolean} [skipOnMissing=false] - Skip processing if Puppeteer fails to launch
 * @property {Object} [puppeteerOptions={}] - Options to pass to puppeteer.launch()
 * @property {import("svguitar").ChordSettings} [SVGuitarConfig={}] - Default configuration options for SVGuitar rendering
 * @property {boolean} [keepAlive=false] - Keep the Puppeteer browser open between processor runs for performance
 */

// Global browser instance for performance
let browserInstance = null;

// Read the svguitar library once at startup
let svguitarLibrary = null;

/**
 * Get the svguitar library content directly from node_modules, reading it once and caching it
 * @returns {string} The svguitar library content
 */
function getSvguitarLibrary() {
  if (!svguitarLibrary) {
    try {
      const svguitarPath = join(
        __dirname,
        "../../node_modules/svguitar/dist/svguitar.umd.js",
      );
      svguitarLibrary = readFileSync(svguitarPath, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to read svguitar library from node_modules: ${error.message}. Make sure svguitar is installed via npm.`,
      );
    }
  }
  return svguitarLibrary;
}

/**
 * Normalize chord data to ensure consistent structure
 * @param {Object[]} chordData
 * @returns
 */
function normaliseChordData(chordData) {
  // Ensure all chord objects have the same structure
  return chordData.map((chord) => ({ barres: chord.barres || [], ...chord }));
}

function adaptConfigToChord(chord, defaultConfig) {
  const frets = Math.max(
    ...chord.fingers.map((f) => (typeof f[1] === "number" ? f[1] : 0)),
    ...(chord.barres || []).map((b) => b.fret),
    3,
  );
  return { ...defaultConfig, frets };
}
/**
 * Remark plugin to transform SVGuitar code blocks into inline SVG images
 * @param {SVGuitarOptions} [options={}] - Plugin configuration options
 * @returns {(tree: import('unist').Node) => Promise<void>} Unified transformer
 */
function remarkSvguitar(options = {}) {
  const {
    errorInline = false,
    skipOnMissing = false,
    puppeteerOptions = {},
    SVGuitarConfig = {},
    keepAlive = false,
  } = options;

  /**
   * Transformer function that processes the AST
   * @param {Object} tree - The AST tree
   * @returns {Promise<void>}
   */
  return async function transformer(tree) {
    const codeBlocks = [];

    // Collect all svguitar code blocks
    visit(
      tree,
      "code",
      /** @type {any} */ (
        (node, index, parent) => {
          if (/** @type {any} */ (node).lang === "svguitar") {
            codeBlocks.push({ node, index, parent });
          }
        }
      ),
    );

    // Skip processing if no SVGuitar blocks found
    if (codeBlocks.length === 0) {
      return;
    }

    // Initialize browser instance if needed
    try {
      if (!browserInstance) {
        browserInstance = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          ...puppeteerOptions,
        });
      }
    } catch (error) {
      const errorMessage = "Failed to launch Puppeteer browser";
      console.error("🎸 SVGuitar error:", errorMessage, error.message);

      if (skipOnMissing) {
        console.warn(
          `⚠️  Puppeteer failed to launch. Skipping SVGuitar blocks.`,
        );
        return;
      }

      // Handle browser launch failure for all blocks
      if (errorInline) {
        for (const { parent, index } of codeBlocks) {
          parent.children[index] = createErrorNode(errorMessage);
        }
      }
      return;
    }

    // Process each code block
    for (let blockIndex = 0; blockIndex < codeBlocks.length; blockIndex++) {
      const { node, index, parent } = codeBlocks[blockIndex];
      try {
        // Parse the chord data
        let parsedData;
        try {
          parsedData = JSON.parse(node.value.trim());
        } catch (parseError) {
          throw new Error(
            `Invalid JSON in SVGuitar block: ${parseError.message}`,
          );
        }

        // Normalize to array format (single chord or multiple chords)
        const chordDataArray = normaliseChordData(
          Array.isArray(parsedData) ? parsedData : [parsedData],
        );

        const SVGuitarConfigArray = chordDataArray.map((chord) =>
          adaptConfigToChord(chord, SVGuitarConfig),
        );
        // Render the chords using Puppeteer with unique block ID
        const svgContent = await renderChordsWithPuppeteer(
          chordDataArray,
          SVGuitarConfigArray,
          blockIndex,
        );

        // Replace the code block with an HTML node containing inline SVG
        parent.children[index] = {
          type: "html",
          value: svgContent,
        };
      } catch (error) {
        const errorMessage = `SVGuitar rendering error: ${error.message}`;
        console.error("🎸 SVGuitar compilation error:", errorMessage);

        if (errorInline) {
          parent.children[index] = createErrorNode(errorMessage);
        }
        // If not inline, keep the original code block and log error
      }
    }

    // Close the browser unless keepAlive requested
    if (!keepAlive) {
      await closeBrowser();
    }
  };
}

/**
 * Renders multiple chord diagrams using Puppeteer and headless Chrome
 * @param {Array} chordDataArray - Array of chord data objects to render
 * @param {import("svguitar").ChordSettings[]} SVGuitarConfigArray - Default configuration options for SVGuitar rendering
 * @param {number} blockId - Unique identifier for this code block
 * @returns {Promise<string>} The rendered SVG content for all chords
 */
async function renderChordsWithPuppeteer(
  chordDataArray,
  SVGuitarConfigArray,
  blockId,
) {
  const page = await browserInstance.newPage();

  try {
    // Get the svguitar library content
    const svguitarScript = getSvguitarLibrary();

    // Create minimal HTML page with SVGuitar embedded directly
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script>${svguitarScript}</script>
    <style>
        body { margin: 0; padding: 20px; }
        .chord-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            align-items: flex-start;
        }
        .chord-item { display: inline-block; }
        .error-svg { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <div class="chord-container">${chordDataArray.map((_, index) => `<div id="chord-block${blockId}-${index}" class="chord-item"></div>`).join("")}</div>
    <script>
        function createErrorSVG(errorMessage) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '300');
            svg.setAttribute('height', '100');
            svg.setAttribute('viewBox', '0 0 300 100');
            svg.setAttribute('class', 'error-svg');

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '300');
            rect.setAttribute('height', '100');
            rect.setAttribute('fill', '#ffebee');
            rect.setAttribute('stroke', '#f44336');
            rect.setAttribute('stroke-width', '2');
            svg.appendChild(rect);

            const text1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text1.setAttribute('x', '150');
            text1.setAttribute('y', '30');
            text1.setAttribute('text-anchor', 'middle');
            text1.setAttribute('fill', '#c62828');
            text1.setAttribute('font-size', '14');
            text1.setAttribute('font-weight', 'bold');
            text1.textContent = 'SVGuitar Error';
            svg.appendChild(text1);

            const text2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text2.setAttribute('x', '150');
            text2.setAttribute('y', '60');
            text2.setAttribute('text-anchor', 'middle');
            text2.setAttribute('fill', '#c62828');
            text2.setAttribute('font-size', '12');
            text2.textContent = errorMessage.substring(0, 80) + (errorMessage.length > 80 ? '...' : '');
            svg.appendChild(text2);

            return svg;
        }

        function renderChords() {
            try {
                // Check if svguitar is available
                if (typeof svguitar === 'undefined') {
                    // Create error SVG in first container if available
                    const firstContainer = document.getElementById('chord-block${blockId}-0');
                    if (firstContainer) {
                        firstContainer.appendChild(createErrorSVG('SVGuitar library not loaded'));
                    }
                    return;
                }

                const chordDataArray = ${JSON.stringify(chordDataArray)};
                const SVGuitarConfigArray = ${JSON.stringify(SVGuitarConfigArray)};
                console.log('Rendering chord data array:', chordDataArray);

                // Render each chord in its own container
                chordDataArray.forEach((chordData, index) => {
                    try {
                        const chart = new svguitar.SVGuitarChord(\`#chord-block${blockId}-\${index}\`);

                        // Configure chart with defaults first to initialize required properties
                        chart.configure(SVGuitarConfigArray[index] || {});

                        // Draw chord - catch any internal SVGuitar errors but continue
                        try {
                            chart.chord(chordData).draw();
                        } catch (drawError) {
                            // SVGuitar may still have created the SVG despite internal errors
                            console.error(\`SVGuitar internal error for chord \${index}: \${drawError.message}\`);
                            console.error(\`Error stack: \${drawError.stack}\`);
                        }
                    } catch (error) {
                        console.error(\`SVGuitar error for chord \${index}:\`, error);
                        console.error(\`Error stack:\`, error.stack);
                        // Create error SVG in the specific chord container
                        const container = document.getElementById(\`chord-block${blockId}-\${index}\`);
                        if (container) {
                            container.appendChild(createErrorSVG(error.message));
                        } else {
                            console.error(\`Container chord-block${blockId}-\${index} not found\`);
                        }
                    }
                });
            } catch (error) {
                console.error('SVGuitar error:', error);
                // Create error SVG in first container if available
                const firstContainer = document.getElementById('chord-block${blockId}-0');
                if (firstContainer) {
                    firstContainer.appendChild(createErrorSVG(error.message));
                }
            }
        }

        // Wait for library to load and DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderChords);
        } else {
            // DOM already loaded, but wait a bit for the script to fully load
            setTimeout(renderChords, 100);
        }
    </script>
</body>
</html>`;

    // Load the HTML and wait for SVGuitar to render
    await page.setContent(html);

    // Enable console logging for debugging
    page.on("console", (msg) => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.log(`Console ${msg.type()}: ${msg.args()[i]}`);
      }
    });

    // Wait for all chords to render (wait for at least one SVG per chord)
    for (let i = 0; i < chordDataArray.length; i++) {
      await page.waitForSelector(`#chord-block${blockId}-${i} svg`, {
        timeout: 10000,
      });
    }

    // Extract all SVG content and combine them
    const combinedContent = await page.evaluate(() => {
      const container = document.querySelector(".chord-container");
      if (!container) {
        throw new Error("Chord container not found after rendering");
      }

      // Return the entire container with all chords
      return container.outerHTML;
    });

    // Fix viewBox for any SVGs with zero height
    const fixedSvgContent = fixMultipleSvgViewBoxes(combinedContent);
    return fixedSvgContent;
  } finally {
    await page.close();
  }
}

// /**
//  * Fixes SVG viewBox when height is zero by calculating actual content bounds
//  * @param {string} svgContent - The SVG content string
//  * @returns {string} Fixed SVG content
//  */
// function fixSvgViewBox(svgContent) {
//   // Check if the viewBox has zero height
//   const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
//   if (!viewBoxMatch) {
//     return svgContent; // No viewBox found, return as-is
//   }

//   const [x, y, width, height] = viewBoxMatch[1].split(' ').map(parseFloat);

//   // If height is not zero, return as-is
//   if (height > 0) {
//     return svgContent;
//   }

//   // Calculate default height based on typical chord diagram proportions
//   // Standard guitar chord diagram is roughly 1.2:1 aspect ratio (height:width)
//   const calculatedHeight = width * 1.2;

//   // Replace the viewBox with the calculated height
//   const fixedViewBox = `viewBox="${x} ${y} ${width} ${calculatedHeight}"`;
//   const fixedSvgContent = svgContent.replace(/viewBox="[^"]+"/, fixedViewBox);

//   console.log(`Fixed SVG viewBox: ${viewBoxMatch[1]} -> ${x} ${y} ${width} ${calculatedHeight}`);

//   return fixedSvgContent;
// }

/**
 * Fixes SVG viewBoxes for multiple SVGs in combined HTML content
 * @param {string} htmlContent - The HTML content containing multiple SVGs
 * @returns {string} Fixed HTML content
 */
function fixMultipleSvgViewBoxes(htmlContent) {
  return htmlContent.replace(/<svg[^>]*>/g, (match) => {
    const viewBoxMatch = match.match(/viewBox="([^"]+)"/);
    if (!viewBoxMatch) {
      return match; // No viewBox found, return as-is
    }

    const [x, y, width, height] = viewBoxMatch[1].split(" ").map(parseFloat);

    // If height is not zero, return as-is
    if (height > 0) {
      return match;
    }

    // Calculate default height based on typical chord diagram proportions
    const calculatedHeight = width * 1.2;
    const fixedViewBox = `viewBox="${x} ${y} ${width} ${calculatedHeight}"`;
    const fixedMatch = match.replace(/viewBox="[^"]+"/, fixedViewBox);

    console.log(
      `Fixed SVG viewBox: ${viewBoxMatch[1]} -> ${x} ${y} ${width} ${calculatedHeight}`,
    );

    return fixedMatch;
  });
}

/**
 * Creates an error node for inline error display
 * @param {string} errorMessage - The error message to display
 * @returns {Object} HTML node with error content
 */
function createErrorNode(errorMessage) {
  const errorHtml = `<div class="svguitar-error">
    <strong>SVGuitar Error:</strong><br>
    <pre>${escapeHtml(errorMessage)}</pre>
  </div>`;

  return {
    type: "html",
    value: errorHtml,
  };
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

/**
 * Cleanup function to close browser instance
 * @returns {Promise<void>}
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Cleanup on process exit
process.on("exit", () => {
  if (browserInstance) {
    browserInstance.close();
  }
});

process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

export default remarkSvguitar;
