import type { Doc } from './_generated/dataModel'

export interface MockReport
  extends Omit<Doc<'reports'>, '_id' | '_creationTime'> {
  _id?: string
  _creationTime?: number
  location?: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
}

export interface MockRoute
  extends Omit<Doc<'routes'>, '_id' | '_creationTime'> {
  _id?: string
  _creationTime?: number
}

export interface MockTransport
  extends Omit<Doc<'transports'>, '_id' | '_creationTime'> {
  _id?: string
  _creationTime?: number
}

export interface MockUser extends Omit<Doc<'users'>, '_id' | '_creationTime'> {
  _id?: string
  _creationTime?: number
}

// Mock routes for Warsaw public transport
export const mockRoutes: MockRoute[] = [
  {
    routeNumber: '52',
    transportMode: 'TRAM',
    source: 'Żoliborz',
    destination: 'Ochota',
    isActive: true,
  },
  {
    routeNumber: '139',
    transportMode: 'BUS',
    source: 'Mokotów',
    destination: 'Białołęka',
    isActive: true,
  },
  {
    routeNumber: 'SKM1',
    transportMode: 'TRAIN',
    source: 'Warszawa Centralna',
    destination: 'Warszawa Lotnisko Chopina',
    isActive: true,
  },
  {
    routeNumber: '18',
    transportMode: 'TRAM',
    source: 'Praga-Południe',
    destination: 'Wola',
    isActive: true,
  },
  {
    routeNumber: '502',
    transportMode: 'BUS',
    source: 'Ursus',
    destination: 'Targówek',
    isActive: true,
  },
]

// Mock transports
export const mockTransports: MockTransport[] = [
  {
    vehicleNumber: 'TRAM-052-001',
    type: 'TRAM',
    route: '52',
    capacity: 200,
    features: ['ac', 'low_floor'],
  },
  {
    vehicleNumber: 'BUS-139-123',
    type: 'BUS',
    route: '139',
    capacity: 80,
    features: ['ac', 'wifi'],
  },
  {
    vehicleNumber: 'TRAIN-SKM1-001',
    type: 'TRAIN',
    route: 'SKM1',
    capacity: 300,
    features: ['ac', 'wifi', 'power_outlets'],
  },
]

// Mock users
export const mockUsers: MockUser[] = [
  {
    name: 'Jan Kowalski',
    tokenIdentifier: 'user1@example.com',
    points: 150,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jan',
    reportsSubmitted: 12,
    verifiedReports: 10,
    reputationScore: 85,
  },
  {
    name: 'Anna Nowak',
    tokenIdentifier: 'user2@example.com',
    points: 320,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
    reportsSubmitted: 28,
    verifiedReports: 25,
    reputationScore: 92,
  },
  {
    name: 'Piotr Wiśniewski',
    tokenIdentifier: 'user3@example.com',
    points: 75,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piotr',
    reportsSubmitted: 8,
    verifiedReports: 6,
    reputationScore: 75,
  },
]

// Mock reports with locations around Warsaw (15km radius)
export const mockReports: MockReport[] = [
  // Delay reports
  {
    userId: 'user1' as any,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportId: 'TRAM-052-001' as any,
    transportMode: 'TRAM',
    route: '52' as any,
    comment:
      'Tram 52 is running about 15 minutes late due to traffic congestion',
    delayMinutes: 15,
    verificationScore: 85,
    location: {
      type: 'Point',
      coordinates: [21.0122, 52.2297], // Warsaw city center
    },
  },
  {
    userId: 'user2' as any,
    status: 'COMMUNITY_VERIFIED',
    type: 'DELAY',
    transportId: 'BUS-139-123' as any,
    transportMode: 'BUS',
    route: '139' as any,
    comment: 'Bus 139 delayed by about 20 minutes, very crowded',
    delayMinutes: 20,
    verificationScore: 92,
    location: {
      type: 'Point',
      coordinates: [21.0439, 52.2401], // Near Warsaw Central Station
    },
  },
  {
    userId: 'user3' as any,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportMode: 'TRAIN',
    route: 'SKM1' as any,
    comment: 'SKM1 train to airport is delayed, waiting on platform',
    delayMinutes: 10,
    verificationScore: 75,
    location: {
      type: 'Point',
      coordinates: [20.9671, 52.1657], // Near Warsaw Chopin Airport
    },
  },
  // Cancellation reports
  {
    userId: 'user1' as any,
    status: 'OFFICIAL_CONFIRMED',
    type: 'CANCELLED',
    transportMode: 'TRAM',
    route: '18' as any,
    comment: 'Tram 18 cancelled due to technical issues',
    verificationScore: 85,
    location: {
      type: 'Point',
      coordinates: [21.0208, 52.2518], // Near Żoliborz district
    },
  },
  // Crowded reports
  {
    userId: 'user2' as any,
    status: 'COMMUNITY_VERIFIED',
    type: 'CROWDED',
    transportId: 'BUS-139-123' as any,
    transportMode: 'BUS',
    route: '139' as any,
    comment: "Bus 139 extremely crowded, can't get on at this stop",
    verificationScore: 92,
    location: {
      type: 'Point',
      coordinates: [21.0023, 52.2098], // Near Mokotów district
    },
  },
  // Accident reports
  {
    userId: 'user3' as any,
    status: 'OFFICIAL_CONFIRMED',
    type: 'ACCIDENT',
    transportMode: 'BUS',
    route: '502' as any,
    comment: 'Minor accident involving bus 502, traffic blocked',
    verificationScore: 75,
    location: {
      type: 'Point',
      coordinates: [20.9897, 52.2319], // Near Ochota district
    },
  },
  // Other reports
  {
    userId: 'user1' as any,
    status: 'UNVERIFIED',
    type: 'OTHER',
    transportMode: 'TRAM',
    route: '52' as any,
    comment: 'Tram 52 announcement system not working',
    verificationScore: 85,
    location: {
      type: 'Point',
      coordinates: [21.0345, 52.2187], // Near Praga district
    },
  },
  // More delay reports
  {
    userId: 'user2' as any,
    status: 'COMMUNITY_VERIFIED',
    type: 'DELAY',
    transportId: 'TRAM-052-001' as any,
    transportMode: 'TRAM',
    route: '52' as any,
    comment: 'Multiple 52 trams running late, seems to be system-wide issue',
    delayMinutes: 25,
    verificationScore: 92,
    location: {
      type: 'Point',
      coordinates: [20.9765, 52.1954], // Near Ursus district
    },
  },
  {
    userId: 'user3' as any,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportMode: 'BUS',
    route: '502' as any,
    comment: 'Bus 502 delayed, traffic jam on Aleje Jerozolimskie',
    delayMinutes: 12,
    verificationScore: 75,
    location: {
      type: 'Point',
      coordinates: [21.0087, 52.2225], // Near City Center
    },
  },
  // Additional cancellation
  {
    userId: 'user1' as any,
    status: 'REJECTED',
    type: 'CANCELLED',
    transportMode: 'TRAIN',
    route: 'SKM1' as any,
    comment: 'SKM1 train appears to be cancelled but no official info',
    verificationScore: 85,
    location: {
      type: 'Point',
      coordinates: [21.1457, 52.2476], // Near Wesoła district (eastern suburb)
    },
  },
]
