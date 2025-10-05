import { action } from './_generated/server'

// Initialize the application with required data
// Note: Cron jobs are now automatically deployed from crons.ts
export default action({
  args: {},
  handler: async (ctx) => {
    console.log('Initializing application...')
    console.log('Application initialization completed!')
    console.log('Cron jobs are automatically registered from crons.ts')
    return { success: true, message: 'Application initialized successfully' }
  },
})
