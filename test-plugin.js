import { remark } from "remark";
import remarkLilypond from "./plugins/remark-lilypond/index.js";

const markdown = `
# Test

\`\`\`lilypond
\\version "2.20.0"
{ c' d' e' f' }
\`\`\`
`;

console.log("Testing plugin with errorInline: true and skipOnMissing: false");

const processor = remark().use(remarkLilypond, {
  binaryPath: "lilypond",
  errorInline: true,
  skipOnMissing: false,
});

try {
  const result = await processor.process(markdown);
  console.log("Result:", result.toString().substring(0, 500));
} catch (error) {
  console.log("Plugin error:", error);
}
