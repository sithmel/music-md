import { readFile } from "fs/promises";
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkLilypond from "./plugins/remark-lilypond/index.js";

const markdownContent = await readFile("demo/example.md", "utf8");

const processor = remark()
  .use(remarkLilypond, {
    binaryPath: "lilypond",
    errorInline: true,
    skipOnMissing: false,
  })
  .use(remarkHtml);

const result = await processor.process(markdownContent);
const output = result.toString();

console.log(
  "HTML output has",
  (output.match(/<svg/g) || []).length,
  "SVG elements",
);
console.log("\n--- First 2000 chars of HTML ---");
console.log(output.substring(0, 2000));
