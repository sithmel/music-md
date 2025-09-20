import { render } from "lilynode";

const testCode = `\\version "2.20.0"
{ c' d' e' f' }`;

console.log("Testing lilynode render...");

try {
  const result = await render(testCode, {
    format: "svg",
    binaryPath: "lilypond",
  });
  console.log("Success! Buffer length:", result.length);
  console.log("First 100 chars:", result.toString("utf8").substring(0, 100));
} catch (error) {
  console.log("Error occurred:");
  console.log("  Message:", error.message);
  console.log("  Code:", error.code);
  console.log("  Full error:", error);
}
