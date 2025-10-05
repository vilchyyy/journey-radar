import { mutation } from './_generated/server'

export const clearReports = mutation({
  handler: async (ctx) => {
    const existingReports = await ctx.db.query('reports').collect()
    for (const report of existingReports) {
      await ctx.db.delete(report._id)
    }

    return {
      deletedReports: existingReports.length,
      message: 'Cleared all existing reports',
    }
  },
})
