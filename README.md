# Music-MD

A markdown renderer that converts markdown files to HTML or PDF with music notation support. Features specialized extensions for LilyPond musical notation and guitar fretboard diagrams.

## Features

- **Multiple Output Formats**: Generate static HTML or PDF from markdown
- **PDF Features**: Automatic page numbering and support for manual page breaks
- **Music Notation**: Two specialized markdown extensions for musical content
- **Modern JavaScript**: Written in plain JavaScript with TypeScript definitions generated from JSDoc comments

## Markdown Extensions

### LilyPond Integration

The LilyPond extension allows you to embed musical notation directly in your markdown:

````markdown
```lilypond
\version "2.20.0"

{
  \clef treble
  \time 4/4
  \key c \major

  c'4 d'4 e'4 f'4 |
  g'4 a'4 b'4 c''2
}
```
````

The plugin will:

- Detect fenced code blocks with the `lilypond` language identifier
- Compile the LilyPond code to SVG using the LilyPond CLI
- Embed the resulting SVG as inline images in your output

### Guitar Fretboard Diagrams

The svguitar extension uses the [svguitar library](https://github.com/omnibrain/svguitar) to render guitar fretboard diagrams:

````markdown
```svguitar
{
  "fingers": [
    [1, 2],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 1],
    [6, "x"]
  ],
  "barres": [],
  "title": "C Major"
}
```
````

The plugin will:

- Detect fenced code blocks with the `svguitar` language identifier
- Parse the JSON chord data within the block
- Render the chord diagram using SVGuitar and Puppeteer (headless Chrome)
- Embed the resulting SVG as inline images in your output

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- LilyPond (for musical notation rendering)
- Google Chrome or Chromium (for guitar chord rendering)

To install LilyPond:

- **macOS**: `brew install lilypond`
- **Ubuntu/Debian**: `apt install lilypond`
- **Windows**: Download from [lilypond.org](https://lilypond.org/download.html)

For guitar chord rendering, the plugin uses Puppeteer which will automatically download a suitable version of Chromium. No additional installation is required.

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd music-md
```

2. Install dependencies:

```bash
npm install
```

## Usage

### Basic Usage

```javascript
import { remark } from "remark";
import remarkHtml from "remark-html";
import remarkLilypond from "./plugins/remark-lilypond/index.js";
import remarkSvguitar from "./plugins/remark-svguitar/index.js";

const processor = remark()
  .use(remarkLilypond)
  .use(remarkSvguitar)
  .use(remarkHtml, { sanitize: false }); // Required: Allow raw HTML/SVG for musical notation

const result = await processor.process(markdownContent);
console.log(result.toString());
```

**Important**: The `sanitize: false` option is required for the SVG musical notation to display. For production use with untrusted content, consider using `remark-rehype` with `rehype-raw` instead for better security.

### Plugin Options

#### LilyPond Plugin Options

```javascript
const processor = remark().use(remarkLilypond, {
  binaryPath: "lilypond", // Path to LilyPond executable
  errorInline: false, // Show errors inline vs console
  skipOnMissing: false, // Skip processing if LilyPond not found
  compact: true, // Remove attribution and crop whitespace (default: true)
});
```

#### SVGuitar Plugin Options

```javascript
const processor = remark().use(remarkSvguitar, {
  errorInline: false, // Show errors inline vs console
  skipOnMissing: false, // Skip processing if Puppeteer fails to launch
  puppeteerOptions: {
    // Options passed to puppeteer.launch()
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});
```

### Running the Demo

Try the included demo to see the plugin in action:

```bash
node demo/demo.js
```

This will process `demo/example.md` and generate `demo/output.html` with rendered musical notation and guitar chord diagrams.

## Development

### Scripts

- `npm test` - Run tests using Node.js test runner
- `npm run format` - Format code using Prettier (no semicolons)
- `npm run types` - Generate TypeScript definitions from JSDoc comments

### Project Structure

```
music-md/
├── plugins/
│   ├── remark-lilypond/
│   │   └── index.js           # LilyPond plugin implementation
│   └── remark-svguitar/
│       └── index.js           # SVGuitar plugin implementation
├── test/
│   ├── remark-lilypond.test.js # LilyPond plugin tests
│   └── remark-svguitar.test.js # SVGuitar plugin tests
├── demo/
│   ├── demo.js                # Demo script
│   └── example.md             # Example markdown
├── package.json
└── README.md
```

### Code Style

- **Language**: Plain JavaScript with JSDoc comments for TypeScript types
- **Testing**: Node.js built-in test runner
- **Formatting**: Prettier with no ending semicolons
- **Types**: TypeScript definitions generated from JSDoc comments

Functions should include comprehensive JSDoc comments with TypeScript type annotations.

## PDF Features (Coming Soon)

When generating PDFs, the following features will be supported:

- Automatic page numbering
- Manual page breaks using a special markdown syntax
- Proper handling of musical notation across page boundaries

## Contributing

1. Write comprehensive JSDoc comments with TypeScript type annotations
2. Add tests for new functionality using the Node.js test runner
3. Format code using Prettier (no semicolons)
4. Ensure all tests pass before submitting

## Troubleshooting

### LilyPond Not Found Error

If you see errors like `lilypond: not found` or `LilyPond executable not found`, LilyPond is not installed or not in your system PATH.

**Solutions:**

1. **Install LilyPond:**
   - **macOS**: `brew install lilypond`
   - **Ubuntu/Debian**: `sudo apt install lilypond`
   - **Windows**: Download from [lilypond.org](https://lilypond.org/download.html)

2. **Verify Installation:**

   ```bash
   lilypond --version
   ```

3. **Specify Custom Path:**

   ```javascript
   const processor = remark().use(remarkLilypond, {
     binaryPath: "/usr/local/bin/lilypond", // Custom path
   });
   ```

4. **Skip Missing LilyPond:**
   ```javascript
   const processor = remark().use(remarkLilypond, {
     skipOnMissing: true, // Skip blocks if LilyPond not available
   });
   ```

### Compilation Errors

LilyPond compilation errors are usually due to invalid syntax. Common issues:

- Missing version declaration: Add `\\version "2.20.0"` at the top
- Unmatched braces: Ensure all `{` have matching `}`
- Invalid note names: Use proper LilyPond syntax

Set `errorInline: true` to see errors in the generated HTML instead of just the console.

### SVG Output Control

The plugin generates compact, clean SVG output by default:

- **Compact mode** (`compact: true`, default): Removes attribution text and crops excessive whitespace
- **Full mode** (`compact: false`): Preserves original LilyPond output including attribution

**Compact mode automatically:**

- Removes "Music engraving by LilyPond" attribution text
- Crops whitespace to focus on musical content
- Significantly reduces SVG file size

**To disable compact mode:**

```javascript
const processor = remark().use(remarkLilypond, {
  compact: false, // Keep full LilyPond output
});
```

### SVGuitar Chord Data Format

The SVGuitar plugin expects JSON chord data in the following format:

```javascript
{
  "fingers": [
    [stringNumber, fretNumber, "fingerText"],
    [1, 3, "3"],  // String 1, Fret 3, Label "3"
    [2, 2, "2"],  // String 2, Fret 2, Label "2"
    [3, 0],       // String 3, Open (no label)
    [4, 0],       // String 4, Open
    [5, 1, "1"],  // String 5, Fret 1, Label "1"
    [6, "x"]      // String 6, Muted
  ],
  "barres": [     // Optional: barre chords
    {
      "fromString": 6,
      "toString": 1,
      "fret": 1,
      "text": "1"
    }
  ],
  "title": "C Major",  // Optional: chord name
  "position": 3       // Optional: fret position indicator
}
```

**Finger Position Format:**

- `[string, fret]` - Basic finger position
- `[string, fret, "text"]` - With finger number/label
- `[string, "x"]` - Muted string
- `[string, 0]` - Open string

**Advanced Styling:**

```javascript

### Multiple Chords In One Block

You can render multiple chord diagrams from a single fenced block by providing an array of chord objects instead of a single object. Each array element follows the same schema (fingers, optional barres, title, position, styling) and produces its own SVG.

````markdown
```svguitar
[
  {
    "title": "C",
    "fingers": [
      [1, 0], [2, 1, "1"], [3, 0], [4, 2, "2"], [5, 3, "3"], [6, "x"]
    ]
  },
  {
    "title": "G",
    "fingers": [
      [1, 3, "3"], [2, 0], [3, 0], [4, 0], [5, 2, "1"], [6, 3, "2"]
    ]
  },
  {
    "title": "F",
    "barres": [{ "fromString": 6, "toString": 1, "fret": 1, "text": "1" }],
    "fingers": [
      [5, 3, "3"], [4, 3, "4"], [3, 2, "2"], [2, 1], [1, 1], [6, 1]
    ]
  }
]
```
````

Notes:
- A top-level JSON array is the simplest form.
- (Optional) A wrapper object like `{ "chords": [ ... ] }` can also be supported if desired; prefer the plain array for brevity.
- If one chord fails to render (e.g. invalid JSON for that element), other chords are still processed. With `errorInline: true`, the failed chord's slot will display an inline error message.

{
  "fingers": [
    [1, 2, { "text": "2", "color": "#ff6b6b" }],
    [2, 3, { "text": "3", "color": "#4ecdc4" }]
  ]
}
```

### SVGuitar Puppeteer Errors

If you encounter errors with SVGuitar rendering:

**Common Issues:**

1. **Puppeteer fails to launch**: Usually due to missing Chrome/Chromium dependencies
2. **JSON parsing errors**: Invalid JSON format in svguitar code blocks
3. **Timeout errors**: Browser takes too long to render the chord

**Solutions:**

1. **Install Chrome dependencies** (Linux):

   ```bash
   sudo apt-get install -y libgbm-dev
   ```

2. **Use skipOnMissing option** in CI environments:

   ```javascript
   const processor = remark().use(remarkSvguitar, {
     skipOnMissing: true, // Skip blocks if Puppeteer fails
   });
   ```

3. **Configure Puppeteer options**:
   ```javascript
   const processor = remark().use(remarkSvguitar, {
     puppeteerOptions: {
       headless: true,
       args: [
         "--no-sandbox",
         "--disable-setuid-sandbox",
         "--disable-dev-shm-usage",
       ],
     },
   });
   ```

### Performance Tips

- Use shorter timeout values for faster failure on invalid code
- Enable `skipOnMissing: true` in CI environments where LilyPond or Puppeteer may not be available
- Cache compiled results if processing the same content repeatedly
- The SVGuitar plugin reuses a single browser instance across all chord renderings for better performance

### HTML Sanitization

The plugin generates raw SVG content that needs to pass through HTML processing:

**Quick Fix (for trusted content):**

```javascript
.use(remarkHtml, { sanitize: false })
```

**Recommended for Production (more secure):**

```javascript
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

const processor = remark()
  .use(remarkLilypond)
  .use(remarkSvguitar)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeStringify);
```

## TypeScript Usage

Full TypeScript definitions are included. You can import the plugins and option types:

```ts
import { remark } from "remark";
import remarkHtml from "remark-html";
import {
  remarkLilypond,
  remarkSvguitar,
  closeBrowser,
  type LilyPondOptions,
  type SVGuitarOptions,
} from "music-md";

const lilyOptions: LilyPondOptions = { compact: true };
const svguitarOptions: SVGuitarOptions = { keepAlive: true };

const processor = remark()
  .use(remarkLilypond, lilyOptions)
  .use(remarkSvguitar, svguitarOptions)
  .use(remarkHtml, { sanitize: false });

const result = await processor.process(markdown);

// When using keepAlive you should close the browser manually after all processing:
await closeBrowser();
```

### SVGuitar keepAlive Option

The `keepAlive` option (default `false`) trades memory for speed across multiple markdown files:

```js
const processor = remark()
  .use(remarkSvguitar, { keepAlive: true })
  .use(remarkHtml, { sanitize: false });

for (const file of files) {
  await processor.process(await fs.promises.readFile(file, "utf8"));
}

await closeBrowser(); // Important when keepAlive = true
```

| Scenario                  | Recommendation                                              |
| ------------------------- | ----------------------------------------------------------- |
| Single file CLI run       | leave `keepAlive` false                                     |
| Batch convert many files  | set `keepAlive: true`                                       |
| Long-lived server process | set `keepAlive: true` and call `closeBrowser()` on shutdown |

## License

ISC
