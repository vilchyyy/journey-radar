'use client'

import { dispatcherAPI } from '@/lib/dispatcher-api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle, CheckCircle, Plus, RefreshCw } from 'lucide-react'

interface Incident {
  _id: string
  _creationTime: number
  source: 'DISPATCHER' | 'SYSTEM'
  status: 'ACTIVE' | 'RESOLVED'
  type: 'DELAY' | 'CANCELLED' | 'ACCIDENT' | 'INFO'
  description: string
  transportMode: 'BUS' | 'TRAIN' | 'TRAM'
  route: string
  validFrom: number
  validUntil?: number
  dispatcherId?: string
  routeDetails?: {
    routeNumber: string
    source: string
    destination: string
  }
}

export default function DispatcherTest() {
  console.log('🚀 Dispatcher Test Page Rendered')

  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for creating incidents
  const [formData, setFormData] = useState({
    type: 'DELAY' as const,
    description: '',
    transportMode: 'BUS' as const,
    routeId: 'test-route-id'
  })

  console.log('📊 Current state:', { incidentsCount: incidents.length, hasStats: !!stats, loading, hasError: !!error })

  const handleLogin = () => {
    console.log('🔐 Logging in as dispatcher')
    localStorage.setItem('dispatcher-token', 'dispatcher-token-dev')
    console.log('✅ Token stored in localStorage')
  }

  const handleLogout = () => {
    console.log('🔓 Logging out')
    localStorage.removeItem('dispatcher-token')
    console.log('✅ Token removed from localStorage')
  }

  const fetchIncidents = async () => {
    console.log('📥 Fetching incidents...')
    try {
      setLoading(true)
      setError(null)
      console.log('📡 Making API call to getIncidents()')
      const response = await dispatcherAPI.getIncidents()
      console.log('📦 API response received:', response)

      if (response.success) {
        console.log('✅ Successfully fetched incidents:', response.data?.length || 0, 'incidents')
        console.log('📝 Incidents data:', response.data)
        setIncidents(response.data || [])
      } else {
        console.log('❌ API returned error:', response.error)
        setError(response.error || 'Failed to fetch incidents')
      }
    } catch (err) {
      console.log('💥 Exception occurred while fetching incidents:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      console.log('🏁 Fetch incidents completed')
    }
  }

  const fetchStats = async () => {
    console.log('📈 Fetching statistics...')
    try {
      setLoading(true)
      setError(null)
      console.log('📡 Making API call to getStats()')
      const response = await dispatcherAPI.getStats()
      console.log('📦 Stats API response received:', response)

      if (response.success) {
        console.log('✅ Successfully fetched stats:', response.data)
        setStats(response.data)
      } else {
        console.log('❌ Stats API returned error:', response.error)
        setError(response.error || 'Failed to fetch stats')
      }
    } catch (err) {
      console.log('💥 Exception occurred while fetching stats:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      console.log('🏁 Fetch stats completed')
    }
  }

  const createIncident = async () => {
    console.log('➕ Creating new incident...')
    console.log('📝 Form data:', formData)

    try {
      setLoading(true)
      setError(null)

      const incidentData = {
        ...formData,
        validFrom: Date.now(),
        validUntil: Date.now() + 3600000 // 1 hour from now
      }
      console.log('📤 Sending incident data:', incidentData)

      console.log('📡 Making API call to createIncident()')
      const response = await dispatcherAPI.createIncident(incidentData)
      console.log('📦 Create incident response received:', response)

      if (response.success) {
        console.log('✅ Successfully created incident:', response.data)
        // Refresh incidents after creating
        console.log('🔄 Refreshing incidents list...')
        fetchIncidents()
        // Reset form
        console.log('🔄 Resetting form...')
        setFormData({
          type: 'DELAY',
          description: '',
          transportMode: 'BUS',
          routeId: 'test-route-id'
        })
      } else {
        console.log('❌ Create incident failed:', response.error)
        setError(response.error || 'Failed to create incident')
      }
    } catch (err) {
      console.log('💥 Exception occurred while creating incident:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      console.log('🏁 Create incident completed')
    }
  }

  const getIncidentTypeColor = (type: string) => {
    const colors = {
      DELAY: 'bg-yellow-500',
      CANCELLED: 'bg-red-500',
      ACCIDENT: 'bg-orange-500',
      INFO: 'bg-blue-500'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-500'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  // Add form change handler with logging
  const handleFormChange = (field: string, value: any) => {
    console.log(`📝 Form field changed: ${field} =`, value)
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dispatcher API Test</h1>
          <p className="text-gray-600">Test the dispatcher API endpoints</p>
        </div>

        {/* Auth Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Set authentication token for API calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleLogin}>Login as Dispatcher</Button>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
            <p className="text-sm text-gray-500">Token: dispatcher-token-dev</p>
          </CardContent>
        </Card>

        {/* API Controls */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>Test dispatcher API functionality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={fetchIncidents} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Get Incidents
              </Button>
              <Button onClick={fetchStats} disabled={loading}>
                Get Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Incident Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Incident</CardTitle>
            <CardDescription>Create a new test incident</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Type</Label>
              <select
                value={formData.type}
                onChange={(e) => handleFormChange('type', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="DELAY">Delay</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ACCIDENT">Accident</option>
                <option value="INFO">Information</option>
              </select>
            </div>
            <div>
              <Label>Transport Mode</Label>
              <select
                value={formData.transportMode}
                onChange={(e) => handleFormChange('transportMode', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="BUS">Bus</option>
                <option value="TRAIN">Train</option>
                <option value="TRAM">Tram</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Describe the incident..."
              />
            </div>
            <Button onClick={createIncident} disabled={loading || !formData.description}>
              <Plus className="h-4 w-4 mr-2" />
              Create Incident
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Display */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.totalActive}</p>
                  <p className="text-sm text-gray-600">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
                  <p className="text-sm text-gray-600">Resolved Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.byTransportMode.BUS}</p>
                  <p className="text-sm text-gray-600">Bus</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{stats.totalIncidents}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incidents List */}
        {incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Incidents ({incidents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(incident.status)}
                        <Badge className={`${getIncidentTypeColor(incident.type)} text-white`}>
                          {incident.type}
                        </Badge>
                        <Badge variant="outline">{incident.transportMode}</Badge>
                      </div>
                      <Badge variant={incident.status === 'ACTIVE' ? 'destructive' : 'secondary'}>
                        {incident.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-2">{incident.description}</h3>
                    <div className="text-sm text-gray-500">
                      <p>Route: {incident.routeDetails?.routeNumber || 'Unknown'}</p>
                      <p>Created: {new Date(incident._creationTime).toLocaleString()}</p>
                      {incident.validUntil && (
                        <p>Valid until: {new Date(incident.validUntil).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}