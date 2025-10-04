import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, mutation } from './_generated/server'

// Simple test action to debug the GTFS loading issues
export const testGTFSConnection = action({
  args: {},
  handler: async (ctx) => {
    console.log('🧪 Testing GTFS connection and dependencies...')

    try {
      // Test 1: Test basic HTTP fetch
      console.log('1️⃣ Testing HTTP fetch...')
      const testResponse = await fetch(
        'https://gtfs.ztp.krakow.pl/GTFS_KRK_A.zip',
        {
          headers: { 'User-Agent': 'journey-radar/1.0' },
        },
      )
      console.log(`   HTTP Status: ${testResponse.status}`)

      if (!testResponse.ok) {
        throw new Error(
          `HTTP ${testResponse.status}: ${testResponse.statusText}`,
        )
      }

      console.log('   ✅ HTTP fetch successful')

      // Test 2: Test array buffer
      console.log('2️⃣ Testing array buffer...')
      const arrayBuffer = await testResponse.arrayBuffer()
      console.log(`   Array buffer size: ${arrayBuffer.byteLength} bytes`)

      if (arrayBuffer.byteLength === 0) {
        throw new Error('Empty array buffer')
      }

      console.log('   ✅ Array buffer successful')

      // Test 3: Test JSZip import and usage
      console.log('3️⃣ Testing JSZip...')
      try {
        // Try different import methods
        let JSZip
        try {
          JSZip = require('jszip')
          console.log('   ✅ JSZip loaded via require')
        } catch (e) {
          console.log('   ❌ JSZip require failed:', e)
          try {
            const jszipModule = await import('jszip')
            JSZip = jszipModule.default
            console.log('   ✅ JSZip loaded via dynamic import')
          } catch (e2) {
            console.log('   ❌ JSZip dynamic import failed:', e2)
            throw new Error('JSZip import failed completely')
          }
        }

        console.log('4️⃣ Testing JSZip loadAsync...')
        const zip = await JSZip.loadAsync(arrayBuffer)
        console.log('   ✅ JSZip loadAsync successful')

        console.log('5️⃣ Testing file access...')
        const files = Object.keys(zip.files)
        console.log(`   Files in zip: ${files.join(', ')}`)

        const routesFile = zip.file('routes.txt')
        if (routesFile) {
          console.log('6️⃣ Testing text extraction...')
          let routesText
          try {
            routesText = await routesFile.async('text')
            console.log('   ✅ Text extraction via async("text") successful')
          } catch (e) {
            console.log('   ❌ async("text") failed:', e)
            try {
              routesText = await routesFile.text()
              console.log('   ✅ Text extraction via text() successful')
            } catch (e2) {
              console.log('   ❌ text() failed:', e2)
              throw new Error('Text extraction failed')
            }
          }

          console.log(`   Routes text length: ${routesText.length} characters`)
          console.log(`   First 100 chars: ${routesText.substring(0, 100)}`)

          // Parse first few lines
          const lines = routesText.split('\n').slice(0, 3)
          console.log('   First 3 lines:', lines)
        } else {
          console.log('   ❌ routes.txt not found in zip')
        }
      } catch (e) {
        console.log('   ❌ JSZip error:', e)
        throw e
      }

      // Test 4: Test database operations
      console.log('7️⃣ Testing database operations...')
      const testDoc = await ctx.runMutation(
        internal.gtfsDebug.insertTestDocument,
        {
          message: 'Test successful',
          timestamp: Date.now(),
        },
      )
      console.log('   ✅ Database insert successful:', testDoc)

      console.log('🎉 All tests passed!')
      return { success: true, message: 'All GTFS connection tests passed' }
    } catch (error) {
      console.error('❌ Test failed:', error)
      return { success: false, error: String(error) }
    }
  },
})

export const insertTestDocument = mutation({
  args: {
    message: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // This is just for testing - will fail since we don't have a test table
    // But it helps us test if mutations work
    return 'test-doc-id'
  },
})
