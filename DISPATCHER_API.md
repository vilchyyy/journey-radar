# Dispatcher API Documentation

This API provides endpoints for managing transport incidents and disruptions in the Journey Radar system.

## Authentication

All dispatcher API endpoints require authentication using a Bearer token.

**Authorization Header:** `Authorization: Bearer <token>`

**Demo Tokens:**
- `dispatcher-token-dev` - Standard dispatcher permissions
- `dispatcher-admin-token` - Admin permissions (can delete incidents)

## Base URL

```
http://localhost:3001/api/dispatcher
```

## Endpoints

### Incidents

#### GET /incidents
Get all incidents with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (`ACTIVE` | `RESOLVED`)
- `transportMode` (optional): Filter by transport mode (`BUS` | `TRAIN` | `TRAM`)
- `limit` (optional): Maximum number of incidents to return

**Example:**
```bash
curl -H "Authorization: Bearer dispatcher-token-dev" \
  "http://localhost:3001/api/dispatcher/incidents?status=ACTIVE&transportMode=BUS"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "k5x7b75318b1q0ks0hmrrt8kxss7rw3jb",
      "_creationTime": 1759627507254,
      "source": "DISPATCHER",
      "status": "ACTIVE",
      "type": "DELAY",
      "description": "Route 52 experiencing 15-minute delays due to heavy traffic",
      "transportMode": "TRAM",
      "route": "k576tajeq07r18eqe187whcqa97rxn2t",
      "validFrom": 1759627500000,
      "validUntil": 1759631100000,
      "dispatcherId": "dispatcher-001",
      "routeDetails": {
        "routeNumber": "52",
        "source": "Żoliborz",
        "destination": "Ochota"
      }
    }
  ],
  "count": 1
}
```

#### POST /incidents
Create a new incident.

**Request Body:**
```json
{
  "type": "DELAY",
  "description": "Route 139 cancelled due to technical issues",
  "transportMode": "BUS",
  "routeId": "k575pt6qpzc22wad269cbv9gjn7rxspz",
  "source": "DISPATCHER",
  "validFrom": 1759627500000,
  "validUntil": 1759631100000
}
```

**Required Fields:**
- `type`: Incident type (`DELAY` | `CANCELLED` | `ACCIDENT` | `INFO`)
- `description`: Human-readable description of the incident
- `transportMode`: Transport mode (`BUS` | `TRAIN` | `TRAM`)
- `routeId`: ID of the affected route

**Optional Fields:**
- `source`: Source of incident (`DISPATCHER` | `SYSTEM`) - defaults to `DISPATCHER`
- `validFrom`: Start time (Unix timestamp in ms) - defaults to current time
- `validUntil`: End time (Unix timestamp in ms) - optional for ongoing incidents

#### GET /incidents/[id]
Get a specific incident by ID.

**Example:**
```bash
curl -H "Authorization: Bearer dispatcher-token-dev" \
  "http://localhost:3001/api/dispatcher/incidents/k5x7b75318b1q0ks0hmrrt8kxss7rw3jb"
```

#### PUT /incidents/[id]
Update an incident's details.

**Request Body:**
```json
{
  "type": "DELAY",
  "description": "Updated description",
  "validUntil": 1759634700000
}
```

#### DELETE /incidents/[id]
Delete an incident (admin only).

**Query Parameters:**
- `dispatcherId` (optional): ID of the dispatcher performing the deletion

#### PUT /incidents/[id]/status
Update an incident's status.

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

#### POST /incidents/[id]/link-reports
Link user reports to an incident, marking them as officially confirmed.

**Request Body:**
```json
{
  "reportIds": ["report1", "report2", "report3"]
}
```

### Routes

#### GET /routes/[routeId]/incidents
Get all active incidents for a specific route.

**Example:**
```bash
curl -H "Authorization: Bearer dispatcher-token-dev" \
  "http://localhost:3001/api/dispatcher/routes/k576tajeq07r18eqe187whcqa97rxn2t/incidents"
```

### Statistics

#### GET /stats
Get incident statistics for the dashboard.

**Example:**
```bash
curl -H "Authorization: Bearer dispatcher-token-dev" \
  "http://localhost:3001/api/dispatcher/stats"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActive": 5,
    "resolvedToday": 12,
    "byTransportMode": {
      "BUS": 3,
      "TRAIN": 1,
      "TRAM": 1
    },
    "byType": {
      "DELAY": 4,
      "CANCELLED": 1,
      "ACCIDENT": 0,
      "INFO": 0
    },
    "totalIncidents": 127
  }
}
```

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized - Invalid or missing authentication"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Forbidden - Insufficient permissions"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required field: description"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to create incident"
}
```

## Incident Types

- `DELAY`: Service delays
- `CANCELLED`: Service cancellations
- `ACCIDENT`: Accidents or emergencies
- `INFO`: General information notices

## Transport Modes

- `BUS`: Bus services
- `TRAIN`: Train services
- `TRAM`: Tram services

## Status Values

- `ACTIVE`: Currently ongoing incident
- `RESOLVED`: Incident has been resolved

## Permissions

**Standard Dispatcher:**
- View incidents
- Create incidents
- Update incidents
- Link reports to incidents

**Admin Dispatcher:**
- All standard permissions
- Delete incidents
- Manage other dispatchers (future feature)