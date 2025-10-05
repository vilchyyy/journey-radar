import { internal } from './_generated/api'
import { action } from './_generated/server'

// Initialize the application with required data and crons
export default action({
  args: {},
  handler: async (ctx) => {
    console.log('Initializing application...')

    // Initialize crons
    console.log('Setting up crons...')
    await ctx.runMutation(internal.gtfsCrons.init)

    console.log('Application initialization completed!')
    return { success: true, message: 'Application initialized successfully' }
  },
})
