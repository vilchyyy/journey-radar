import RealtimeMap from '@/components/realtime-map'

export default function MapPage() {
  return (
    <div className="relative flex h-screen w-full flex-col bg-background">
      <RealtimeMap />
    </div>
  )
}
