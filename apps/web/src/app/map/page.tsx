import RealtimeMap from '@/components/realtime-map'
import RouteNavigation from '@/components/route-navigation'

export default function MapPage() {
  return (
    <div className="w-full h-screen relative">
      <RealtimeMap />
      <RouteNavigation />
    </div>
  )
}
