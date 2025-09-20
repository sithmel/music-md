import remarkSvguitar, { closeBrowser } from './plugins/remark-svguitar/index.js'
import { remark } from 'remark'

// Test with SVGuitar official example format
const testChordCorrect = `\`\`\`svguitar
{
  "fingers": [
    [2, 2, "2"],
    [3, 3, "4"],
    [4, 3, "3"],
    [6, "x"]
  ],
  "title": "F# minor"
}
\`\`\``

// Test with our original format
const testChordOriginal = `\`\`\`svguitar
{
  "fingers": [
    [1, 3],
    [2, 2],
    [3, 0],
    [4, 0],
    [5, 1],
    [6, 3]
  ],
  "title": "C Major"
}
\`\`\``

async function testChordFormats() {
  try {
    const processor = remark().use(remarkSvguitar, {
      errorInline: true,
      skipOnMissing: false
    })

    console.log('Testing OFFICIAL format (F# minor)...')
    const result1 = await processor.process(testChordCorrect)
    const output1 = result1.toString()
    console.log('Has finger circles:', output1.includes('class="finger'))
    console.log('ViewBox:', output1.match(/viewBox="[^"]*"/)?.[0] || 'not found')

    console.log('\n' + '='.repeat(50) + '\n')

    console.log('Testing OUR format (C Major)...')
    const result2 = await processor.process(testChordOriginal)
    const output2 = result2.toString()
    console.log('Has finger circles:', output2.includes('class="finger'))
    console.log('ViewBox:', output2.match(/viewBox="[^"]*"/)?.[0] || 'not found')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await closeBrowser()
  }
}

testChordFormats()