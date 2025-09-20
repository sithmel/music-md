import { readFile } from "fs/promises";
import { remark } from "remark";
import remarkLilypond from "./plugins/remark-lilypond/index.js";

const markdownContent = await readFile("demo/example.md", "utf8");
console.log(
  "Input markdown has",
  (markdownContent.match(/```lilypond/g) || []).length,
  "lilypond blocks",
);

const processor = remark().use(remarkLilypond, {
  binaryPath: "lilypond",
  errorInline: true,
  skipOnMissing: false,
});

const result = await processor.process(markdownContent);
const output = result.toString();

console.log("Output has", (output.match(/<svg/g) || []).length, "SVG elements");
console.log(
  "Output has",
  (output.match(/lilypond-error/g) || []).length,
  "error divs",
);
console.log(
  "Output has",
  (output.match(/```lilypond/g) || []).length,
  "remaining lilypond blocks",
);

console.log("\n--- Output preview (first 1000 chars) ---");
console.log(output.substring(0, 1000));
