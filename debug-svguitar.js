import remarkSvguitar, { closeBrowser } from './plugins/remark-svguitar/index.js'
import { remark } from 'remark'

const testChord = `\`\`\`svguitar
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

async function testSvguitar() {
  try {
    console.log('Testing SVGuitar plugin with C Major chord...')

    const processor = remark().use(remarkSvguitar, {
      errorInline: true,
      skipOnMissing: false
    })

    const result = await processor.process(testChord)
    const output = result.toString()

    console.log('\n=== OUTPUT START ===')
    console.log(output)
    console.log('=== OUTPUT END ===\n')

    if (output.includes('<svg')) {
      console.log('✓ SVG generated successfully')

      // Check for specific issues
      if (output.includes('viewBox="0 0 400 0"')) {
        console.log('⚠️  Warning: viewBox height is 0')
      }
      if (output.includes('y1="-')) {
        console.log('⚠️  Warning: Negative coordinates detected')
      }
    } else {
      console.log('❌ No SVG found in output')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await closeBrowser()
  }
}

testSvguitar()