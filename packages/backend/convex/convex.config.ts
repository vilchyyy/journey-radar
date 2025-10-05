import betterAuth from '@convex-dev/better-auth/convex.config'
import crons from '@convex-dev/crons/convex.config'
import geospatial from '@convex-dev/geospatial/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(betterAuth)
app.use(geospatial)
app.use(crons)

export default app
