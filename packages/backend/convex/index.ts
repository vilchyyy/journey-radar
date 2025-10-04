import { GeospatialIndex } from '@convex-dev/geospatial'
import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'

// Initialize the geospatial index component
export const geospatial = new GeospatialIndex<Id<'reports'>>(
  components.geospatial,
)
