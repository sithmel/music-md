//@ts-check
/**
 * @fileoverview Demo script for the remark-lilypond and remark-svguitar plugins
 */

import { readFile, writeFile } from "fs/promises";
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkLilypond from "../plugins/remark-lilypond/index.js";
import remarkSvguitar, {
  closeBrowser,
} from "../plugins/remark-svguitar/index.js";

/**
 * Main demo function
 */
async function runDemo() {
  try {
    console.log("Running Music-MD plugins demo...");

    // Read the example markdown file
    const markdownContent = await readFile("demo/example.md", "utf8");
    console.log("✓ Read example markdown file");

    // Create processor with plugins
    const processor = remark()
      .use(remarkLilypond, {
        binaryPath: "lilypond",
        errorInline: true,
        skipOnMissing: true, // Skip if LilyPond not available
      })
      .use(remarkSvguitar, {
        errorInline: true,
        skipOnMissing: true, // Skip if Puppeteer not available
      })
      .use(remarkHtml, { sanitize: false }); // Allow raw HTML/SVG (needed for musical notation)

    // Process the markdown
    console.log("🎵 Processing LilyPond blocks...");
    console.log("🎸 Processing SVGuitar blocks...");
    const result = await processor.process(markdownContent);

    // Create HTML output
    const htmlOutput = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Music-MD Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .lilypond-error, .svguitar-error {
            background-color: #ffebee;
            color: #c62828;
            padding: 10px;
            border-left: 4px solid #f44336;
            margin: 10px 0;
            border-radius: 4px;
        }
        svg {
            max-width: 100%;
            height: auto;
        }
        .chord-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            max-width: 100%;
            gap: 20px;
            align-items: start;
            justify-content: center;
        }
        @supports not (display: grid) {
            .chord-container {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                align-items: flex-start;
            }
        }
        .chord-container:has(.chord-item:nth-child(2)) {
            grid-template-columns: repeat(2, 1fr);
        }
        .chord-container:has(.chord-item:nth-child(3)) {
            grid-template-columns: repeat(3, 1fr);
        }
        .chord-container:has(.chord-item:nth-child(4)) {
            grid-template-columns: repeat(4, 1fr);
        }
        .chord-container:has(.chord-item:nth-child(5)) {
            grid-template-columns: repeat(4, 1fr);
        }
        pre {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        h1, h2 {
            color: #333;
        }
    </style>
</head>
<body>
${result.toString()}
</body>
</html>`;

    // Write the output
    await writeFile("demo/output.html", htmlOutput, "utf8");
    console.log("✓ Generated demo/output.html");

    console.log("\nDemo completed successfully!");
    console.log("Open demo/output.html in your browser to see the results.");

    // Show some stats
    const lilypondBlocks = (markdownContent.match(/```lilypond/g) || []).length;
    const svguitarBlocks = (markdownContent.match(/```svguitar/g) || []).length;
    console.log(
      `\nProcessed ${lilypondBlocks} LilyPond code blocks and ${svguitarBlocks} SVGuitar code blocks.`,
    );
  } catch (err) {
    // Normalize unknown exceptions so we can safely read .message
    const error = err instanceof Error ? err : new Error(String(err));

    console.error("❌ Demo failed:", error.message);

    if (String(error.message).includes("lilypond")) {
      console.log(
        "\n💡 Make sure LilyPond is installed and available in your PATH.",
      );
      console.log(
        "   You can install it from: https://lilypond.org/download.html",
      );
    }

    process.exit(1);
  } finally {
    // Always clean up browser resources
    try {
      await closeBrowser();
    } catch (closeErr) {
      // ignore cleanup errors
    }
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export default runDemo;
