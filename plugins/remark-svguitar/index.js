/**
 * @fileoverview Remark plugin for converting SVGuitar code blocks to inline SVG
 */

import { visit } from "unist-util-visit";
import puppeteer from "puppeteer";

/**
 * @typedef {Object} SVGuitarOptions
 * @property {boolean} [errorInline=false] - Whether to display errors inline or log to console
 * @property {boolean} [skipOnMissing=false] - Skip processing if Puppeteer fails to launch
 * @property {Object} [puppeteerOptions={}] - Options to pass to puppeteer.launch()
 */

// Global browser instance for performance
let browserInstance = null;

/**
 * Remark plugin to transform SVGuitar code blocks into inline SVG images
 * @param {SVGuitarOptions} [options={}] - Plugin configuration options
 * @returns {Function} The transformer function
 */
function remarkSvguitar(options = {}) {
  const {
    errorInline = false,
    skipOnMissing = false,
    puppeteerOptions = {},
  } = options;

  /**
   * Transformer function that processes the AST
   * @param {Object} tree - The AST tree
   * @returns {Promise<void>}
   */
  return async function transformer(tree) {
    const codeBlocks = [];

    // Collect all svguitar code blocks
    visit(tree, "code", (node, index, parent) => {
      if (node.lang === "svguitar") {
        codeBlocks.push({ node, index, parent });
      }
    });

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
    for (const { node, index, parent } of codeBlocks) {
      try {
        // Parse the chord data
        let chordData;
        try {
          chordData = JSON.parse(node.value.trim());
        } catch (parseError) {
          throw new Error(
            `Invalid JSON in SVGuitar block: ${parseError.message}`,
          );
        }

        // Render the chord using Puppeteer
        const svgContent = await renderChordWithPuppeteer(chordData);

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
  };
}

/**
 * Renders a chord diagram using Puppeteer and headless Chrome
 * @param {Object} chordData - The chord data to render
 * @returns {Promise<string>} The rendered SVG content
 */
async function renderChordWithPuppeteer(chordData) {
  const page = await browserInstance.newPage();

  try {
    // Create minimal HTML page with SVGuitar
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://unpkg.com/svguitar@latest/dist/svguitar.umd.js"></script>
    <style>
        body { margin: 0; padding: 20px; }
        #chord-container { display: inline-block; }
        .error-svg { font-family: Arial, sans-serif; }
    </style>
</head>
<body>
    <div id="chord-container"></div>
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
            text2.textContent = errorMessage.substring(0, 40) + (errorMessage.length > 40 ? '...' : '');
            svg.appendChild(text2);

            document.getElementById('chord-container').appendChild(svg);
        }

        function renderChord() {
            try {
                // Check if svguitar is available
                if (typeof svguitar === 'undefined') {
                    createErrorSVG('SVGuitar library not loaded');
                    return;
                }

                const chordData = ${JSON.stringify(chordData)};
                console.log('Rendering chord data:', chordData);

                const chart = new svguitar.SVGuitarChord('#chord-container');

                // Configure chart with simpler defaults
                chart.configure({
                    style: 'normal',
                    strings: 6,
                    frets: 4,
                    orientation: 'vertical'
                });

                chart.chord(chordData).draw();
                console.log('Chord rendered successfully');
            } catch (error) {
                console.error('SVGuitar error:', error);
                createErrorSVG(error.message);
            }
        }

        // Wait for library to load and DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderChord);
        } else {
            // DOM already loaded, but wait a bit for the script to fully load
            setTimeout(renderChord, 100);
        }
    </script>
</body>
</html>`;

    // Load the HTML and wait for SVGuitar to render
    await page.setContent(html);

    // Enable console logging for debugging
    page.on('console', msg => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.log(`Console ${msg.type()}: ${msg.args()[i]}`);
      }
    });

    // Wait for either a successful render or an error SVG
    await page.waitForSelector("#chord-container svg", { timeout: 10000 });

    // Extract the SVG content
    const svgContent = await page.evaluate(() => {
      const svgElement = document.querySelector("#chord-container svg");
      if (!svgElement) {
        throw new Error("SVG element not found after rendering");
      }
      return svgElement.outerHTML;
    });

    // Fix viewBox for SVGs with zero height
    const fixedSvgContent = fixSvgViewBox(svgContent);
    return fixedSvgContent;
  } finally {
    await page.close();
  }
}

/**
 * Fixes SVG viewBox when height is zero by calculating actual content bounds
 * @param {string} svgContent - The SVG content string
 * @returns {string} Fixed SVG content
 */
function fixSvgViewBox(svgContent) {
  // Check if the viewBox has zero height
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    return svgContent; // No viewBox found, return as-is
  }

  const [x, y, width, height] = viewBoxMatch[1].split(' ').map(parseFloat);

  // If height is not zero, return as-is
  if (height > 0) {
    return svgContent;
  }

  // Calculate default height based on typical chord diagram proportions
  // Standard guitar chord diagram is roughly 1.2:1 aspect ratio (height:width)
  const calculatedHeight = width * 1.2;

  // Replace the viewBox with the calculated height
  const fixedViewBox = `viewBox="${x} ${y} ${width} ${calculatedHeight}"`;
  const fixedSvgContent = svgContent.replace(/viewBox="[^"]+"/, fixedViewBox);

  console.log(`Fixed SVG viewBox: ${viewBoxMatch[1]} -> ${x} ${y} ${width} ${calculatedHeight}`);

  return fixedSvgContent;
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
