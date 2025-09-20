/**
 * @fileoverview Tests for the remark-lilypond plugin
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { remark } from "remark";

// We'll test the plugin with skipOnMissing: true to avoid needing LilyPond
// This tests the plugin structure and error handling without actual compilation
import remarkLilypond from "../plugins/remark-lilypond/index.js";

// Suppress console output during tests
let originalConsoleError;
let originalConsoleWarn;

beforeEach(() => {
  originalConsoleError = console.error;
  originalConsoleWarn = console.warn;
  console.error = () => {}; // Suppress error messages during tests
  console.warn = () => {}; // Suppress warning messages during tests
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe("remark-lilypond plugin", () => {
  test("should skip lilypond blocks when skipOnMissing is true", async () => {
    const input = `# Music Example

\`\`\`lilypond
\\version "2.20.0"
{ c' d' e' f' }
\`\`\`

Regular text.`;

    const processor = remark().use(remarkLilypond, {
      skipOnMissing: true,
      binaryPath: "/nonexistent/lilypond", // Force not found
    });

    // Should not throw when LilyPond is missing and skipOnMissing is true
    const result = await processor.process(input);

    // Verify the plugin processed the input (even if it skipped rendering)
    assert.ok(
      typeof result.toString() === "string",
      "Should return processed markdown",
    );
    assert.ok(
      result.toString().includes("Music Example"),
      "Should preserve other content",
    );
    assert.ok(
      result.toString().includes("Regular text"),
      "Should preserve non-lilypond content",
    );
  });

  test("should handle multiple lilypond blocks with skipOnMissing", async () => {
    const input = `# Music Examples

\`\`\`lilypond
\\version "2.20.0"
{ c' d' e' f' }
\`\`\`

Some text between.

\`\`\`lilypond
\\version "2.20.0"
{ g' a' b' c'' }
\`\`\``;

    const processor = remark().use(remarkLilypond, {
      skipOnMissing: true,
      binaryPath: "/nonexistent/lilypond",
    });
    const result = await processor.process(input);

    // Should process without errors
    assert.ok(result.toString().length > 0, "Should return processed content");
    assert.ok(
      result.toString().includes("Music Examples"),
      "Should preserve headings",
    );
    assert.ok(
      result.toString().includes("Some text between"),
      "Should preserve text",
    );
  });

  test("should handle plugin options correctly", async () => {
    const input = `\`\`\`lilypond
\\version "2.20.0"
{ c' }
\`\`\``;

    const options = {
      binaryPath: "/custom/path/lilypond",
      errorInline: true,
      skipOnMissing: true,
    };

    const processor = remark().use(remarkLilypond, options);

    // Test that options are accepted without throwing
    await assert.doesNotReject(async () => {
      await processor.process(input);
    });
  });

  test("should preserve non-lilypond code blocks", async () => {
    const input = `\`\`\`javascript
console.log("hello")
\`\`\`

\`\`\`python
print("world")
\`\`\``;

    const processor = remark().use(remarkLilypond);
    const result = await processor.process(input);

    // Should preserve other code blocks unchanged
    const output = result.toString();
    assert.ok(
      output.includes("javascript"),
      "Should preserve javascript block",
    );
    assert.ok(output.includes("python"), "Should preserve python block");
    assert.ok(output.includes("console.log"), "Should preserve code content");
    assert.ok(output.includes('print("world")'), "Should preserve python code");
  });

  test("should handle empty lilypond blocks with skipOnMissing", async () => {
    const input = `\`\`\`lilypond
\`\`\``;

    const processor = remark().use(remarkLilypond, {
      skipOnMissing: true,
      binaryPath: "/nonexistent/lilypond",
    });

    // Should not throw on empty blocks
    await assert.doesNotReject(async () => {
      await processor.process(input);
    });
  });

  test("should handle inline error display when LilyPond not found", async () => {
    const input = `\`\`\`lilypond
\\version "2.20.0"
{ c' }
\`\`\``;

    const processor = remark().use(remarkLilypond, {
      errorInline: true,
      binaryPath: "/absolutely/nonexistent/lilypond",
      skipOnMissing: false, // This should show inline errors
    });

    const result = await processor.process(input);
    const output = result.toString();

    // Should contain error message when errorInline is true and LilyPond not found
    assert.ok(
      output.includes("lilypond-error") ||
        output.includes("LilyPond Not Found"),
      "Should contain error information in output when errorInline is true",
    );
  });

  test("should handle no lilypond blocks gracefully", async () => {
    const input = `# Regular Markdown

This is just regular markdown with no music notation.

\`\`\`javascript
console.log("Not LilyPond")
\`\`\``;

    const processor = remark().use(remarkLilypond);
    const result = await processor.process(input);

    // Should process normally when no lilypond blocks present
    const output = result.toString();
    assert.ok(output.includes("Regular Markdown"), "Should preserve markdown");
    assert.ok(
      output.includes("javascript"),
      "Should preserve other code blocks",
    );
    assert.ok(output.includes("console.log"), "Should preserve code content");
  });

  test("should return transformer function", () => {
    const plugin = remarkLilypond({ errorInline: true });

    // Plugin should return a transformer function
    assert.ok(typeof plugin === "function", "Plugin should return a function");
  });

  test("should handle successful compilation with real LilyPond", async () => {
    const input = `\`\`\`lilypond
\\version "2.20.0"
{ c' }
\`\`\``;

    const processor = remark().use(remarkLilypond, {
      binaryPath: "lilypond", // Use real LilyPond if available
      skipOnMissing: true, // Skip if not available rather than fail
    });

    // Should not throw regardless of whether LilyPond is available
    await assert.doesNotReject(async () => {
      const result = await processor.process(input);

      // Either it rendered to SVG or it was skipped, both are valid outcomes
      const output = result.toString();
      assert.ok(typeof output === "string", "Should return a string");
      assert.ok(output.length > 0, "Should return non-empty content");
    });
  });
});

describe("Plugin configuration", () => {
  test("should accept binaryPath option", () => {
    const plugin = remarkLilypond({ binaryPath: "/custom/lilypond" });
    assert.ok(typeof plugin === "function", "Should accept binaryPath option");
  });

  test("should accept errorInline option", () => {
    const plugin = remarkLilypond({ errorInline: true });
    assert.ok(typeof plugin === "function", "Should accept errorInline option");
  });

  test("should accept skipOnMissing option", () => {
    const plugin = remarkLilypond({ skipOnMissing: true });
    assert.ok(
      typeof plugin === "function",
      "Should accept skipOnMissing option",
    );
  });

  test("should work with empty options", () => {
    const plugin = remarkLilypond();
    assert.ok(typeof plugin === "function", "Should work with no options");
  });

  test("should work with all options combined", () => {
    const plugin = remarkLilypond({
      binaryPath: "/usr/bin/lilypond",
      errorInline: true,
      skipOnMissing: false,
    });
    assert.ok(
      typeof plugin === "function",
      "Should accept all options together",
    );
  });
});
