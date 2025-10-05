import { AUTH_ERRORS } from './dispatcher-auth'

const API_BASE = '/api/dispatcher'

class DispatcherAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('dispatcher-token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(
    response: Response,
  ): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('dispatcher-token')
        window.location.href = '/dispatcher'
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }

    return data
  }

  // Incidents
  async getIncidents(params?: {
    status?: 'ACTIVE' | 'RESOLVED'
    transportMode?: 'BUS' | 'TRAIN' | 'TRAM'
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.transportMode)
      searchParams.append('transportMode', params.transportMode)
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const response = await fetch(`${API_BASE}/incidents?${searchParams}`, {
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  async getIncident(incidentId: string) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  async createIncident(data: {
    type: 'DELAY' | 'CANCELLED' | 'ACCIDENT' | 'INFO'
    description: string
    transportMode: 'BUS' | 'TRAIN' | 'TRAM'
    routeId: string
    source?: 'DISPATCHER' | 'SYSTEM'
    validFrom?: number
    validUntil?: number
  }) {
    const response = await fetch(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  async updateIncident(
    incidentId: string,
    data: {
      type?: 'DELAY' | 'CANCELLED' | 'ACCIDENT' | 'INFO'
      description?: string
      validUntil?: number
    },
  ) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })

    return this.handleResponse(response)
  }

  async updateIncidentStatus(
    incidentId: string,
    status: 'ACTIVE' | 'RESOLVED',
  ) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    })

    return this.handleResponse(response)
  }

  async deleteIncident(incidentId: string) {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  async linkReportsToIncident(incidentId: string, reportIds: string[]) {
    const response = await fetch(
      `${API_BASE}/incidents/${incidentId}/link-reports`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reportIds }),
      },
    )

    return this.handleResponse(response)
  }

  // Route-specific incidents
  async getRouteIncidents(routeId: string) {
    const response = await fetch(`${API_BASE}/routes/${routeId}/incidents`, {
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }

  // Statistics
  async getStats() {
    const response = await fetch(`${API_BASE}/stats`, {
      headers: this.getAuthHeaders(),
    })

    return this.handleResponse(response)
  }
}

export const dispatcherAPI = new DispatcherAPI()
