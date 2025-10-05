
export interface MockReport {
  _id?: string
  _creationTime?: number
  location?: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  // Report fields matching current schema
  userId?: any // Id<'users'> | undefined
  isAnonymous: boolean
  status: 'UNVERIFIED' | 'COMMUNITY_VERIFIED' | 'OFFICIAL_CONFIRMED' | 'REJECTED'
  type: 'DELAY' | 'CANCELLED' | 'CROWDED' | 'ACCIDENT' | 'OTHER'
  transportMode: 'BUS' | 'TRAIN' | 'TRAM'
  route?: any // Id<'routes'> | undefined
  gtfsRouteId?: string
  gtfsTripId?: string
  gtfsVehicleId?: string
  routeShortName?: string
  comment?: string
  delayMinutes?: number
  verificationScore: number
  incidentId?: any // Id<'incidents'> | undefined
  clusterId?: any // Id<'reportClusters'> | undefined
  upvotes: number
  downvotes: number
  voteScore: number
}

export interface MockRoute {
  _id?: string
  _creationTime?: number
  routeNumber: string
  transportMode: 'BUS' | 'TRAIN' | 'TRAM'
  source: string
  destination: string
  isActive: boolean
}

export interface MockUser {
  _id?: string
  _creationTime?: number
  name: string
  tokenIdentifier: string
  points: number
  avatarUrl?: string
  reportsSubmitted: number
  verifiedReports: number
  reputationScore: number
  receivedUpvotes: number
}


// Mock routes for Kraków public transport
export const mockRoutes: MockRoute[] = [
  {
    routeNumber: '4',
    transportMode: 'TRAM',
    source: 'Wzgórza Krzesławickie',
    destination: 'Bronowice Małe',
    isActive: true,
  },
  {
    routeNumber: '8',
    transportMode: 'TRAM',
    source: 'Borek Fałęcki',
    destination: 'Bronowice Małe',
    isActive: true,
  },
  {
    routeNumber: '13',
    transportMode: 'TRAM',
    source: 'Nowy Bieżanów',
    destination: 'Kopiec Wandy',
    isActive: true,
  },
  {
    routeNumber: '18',
    transportMode: 'TRAM',
    source: 'Mistrzejowice',
    destination: 'Płaszów',
    isActive: true,
  },
  {
    routeNumber: '502',
    transportMode: 'BUS',
    source: 'Krowodrza Górka',
    destination: 'Witkowice',
    isActive: true,
  },
  {
    routeNumber: '139',
    transportMode: 'BUS',
    source: 'Mistrzejowice',
    destination: 'Salwator',
    isActive: true,
  },
  {
    routeNumber: '184',
    transportMode: 'BUS',
    source: 'Kombinat',
    destination: 'Os. Piastów',
    isActive: true,
  },
  {
    routeNumber: '605',
    transportMode: 'BUS',
    source: 'Rondo Kocmyrzowskie',
    destination: 'Nowy Kleparz',
    isActive: true,
  },
  {
    routeNumber: 'SK1',
    transportMode: 'TRAIN',
    source: 'Kraków Główny',
    destination: 'Kraków Lotnisko',
    isActive: true,
  },
  {
    routeNumber: 'SK2',
    transportMode: 'TRAIN',
    source: 'Kraków Główny',
    destination: 'Wieliczka Rynek-Kopalnia',
    isActive: true,
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
    receivedUpvotes: 25,
  },
  {
    name: 'Anna Nowak',
    tokenIdentifier: 'user2@example.com',
    points: 320,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
    reportsSubmitted: 28,
    verifiedReports: 25,
    reputationScore: 92,
    receivedUpvotes: 47,
  },
  {
    name: 'Piotr Wiśniewski',
    tokenIdentifier: 'user3@example.com',
    points: 75,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Piotr',
    reportsSubmitted: 8,
    verifiedReports: 6,
    reputationScore: 75,
    receivedUpvotes: 12,
  },
]

// Mock reports with locations around Kraków (15km radius)
export const mockReports: MockReport[] = [
  // Delay reports
  {
    userId: undefined as any, // Anonymous report
    isAnonymous: true,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportMode: 'TRAM',
    route: '4' as any,
    routeShortName: '4',
    comment: 'Tram 4 is running about 15 minutes late due to traffic congestion',
    delayMinutes: 15,
    verificationScore: 0.5,
    upvotes: 0,
    downvotes: 0,
    voteScore: 0,
    location: {
      type: 'Point',
      coordinates: [19.9383, 50.0614], // Kraków city center
    },
  },
  {
    userId: undefined as any, // Anonymous report
    isAnonymous: false, // But no userId - this will be handled by the seeding script
    status: 'COMMUNITY_VERIFIED',
    type: 'DELAY',
    transportMode: 'BUS',
    route: '139' as any,
    routeShortName: '139',
    comment: 'Bus 139 delayed by about 20 minutes, very crowded',
    delayMinutes: 20,
    verificationScore: 0.8,
    upvotes: 5,
    downvotes: 1,
    voteScore: 4,
    location: {
      type: 'Point',
      coordinates: [19.9502, 50.0647], // Near Main Market Square
    },
  },
  {
    userId: undefined as any,
    isAnonymous: true,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportMode: 'TRAIN',
    routeShortName: 'SK1',
    gtfsRouteId: 'SK1',
    comment: 'SK1 train to airport is delayed, waiting on platform',
    delayMinutes: 10,
    verificationScore: 0.5,
    upvotes: 0,
    downvotes: 0,
    voteScore: 0,
    location: {
      type: 'Point',
      coordinates: [19.9249, 50.0776], // Near Kraków Główny
    },
  },
  // Cancellation reports
  {
    userId: undefined as any,
    isAnonymous: false,
    status: 'OFFICIAL_CONFIRMED',
    type: 'CANCELLED',
    transportMode: 'TRAM',
    route: '18' as any,
    routeShortName: '18',
    comment: 'Tram 18 cancelled due to technical issues',
    verificationScore: 0.9,
    upvotes: 12,
    downvotes: 0,
    voteScore: 12,
    location: {
      type: 'Point',
      coordinates: [19.9514, 50.0698], // Near Old Town
    },
  },
  // Crowded reports
  {
    userId: undefined as any,
    isAnonymous: false,
    status: 'COMMUNITY_VERIFIED',
    type: 'CROWDED',
    transportMode: 'BUS',
    route: '502' as any,
    routeShortName: '502',
    comment: "Bus 502 extremely crowded, can't get on at this stop",
    verificationScore: 0.7,
    upvotes: 3,
    downvotes: 0,
    voteScore: 3,
    location: {
      type: 'Point',
      coordinates: [19.9273, 50.0586], // Near Kazimierz district
    },
  },
  // Accident reports
  {
    userId: undefined as any,
    isAnonymous: true,
    status: 'OFFICIAL_CONFIRMED',
    type: 'ACCIDENT',
    transportMode: 'BUS',
    route: '184' as any,
    routeShortName: '184',
    comment: 'Minor accident involving bus 184, traffic blocked',
    verificationScore: 0.6,
    upvotes: 8,
    downvotes: 2,
    voteScore: 6,
    location: {
      type: 'Point',
      coordinates: [19.9124, 50.0661], // Near Grzegórzki district
    },
  },
  // Other reports
  {
    userId: undefined as any,
    isAnonymous: false,
    status: 'UNVERIFIED',
    type: 'OTHER',
    transportMode: 'TRAM',
    route: '8' as any,
    routeShortName: '8',
    comment: 'Tram 8 announcement system not working',
    verificationScore: 0.4,
    upvotes: 0,
    downvotes: 1,
    voteScore: -1,
    location: {
      type: 'Point',
      coordinates: [19.9445, 50.0524], // Near Podgórze district
    },
  },
  // More delay reports with GTFS data
  {
    userId: undefined as any,
    isAnonymous: false,
    status: 'COMMUNITY_VERIFIED',
    type: 'DELAY',
    transportMode: 'TRAM',
    gtfsRouteId: '4',
    gtfsTripId: 'trip_123',
    gtfsVehicleId: 'vehicle_456',
    routeShortName: '4',
    comment: 'Multiple 4 trams running late, seems to be system-wide issue',
    delayMinutes: 25,
    verificationScore: 0.85,
    upvotes: 7,
    downvotes: 0,
    voteScore: 7,
    location: {
      type: 'Point',
      coordinates: [19.9622, 50.0733], // Near Nowa Huta
    },
  },
  {
    userId: undefined as any,
    isAnonymous: true,
    status: 'UNVERIFIED',
    type: 'DELAY',
    transportMode: 'BUS',
    route: '605' as any,
    routeShortName: '605',
    comment: 'Bus 605 delayed, traffic jam on Aleja Trzech Wieszczów',
    delayMinutes: 12,
    verificationScore: 0.5,
    upvotes: 0,
    downvotes: 0,
    voteScore: 0,
    location: {
      type: 'Point',
      coordinates: [19.9289, 50.0623], // Near City Center
    },
  },
  // Additional cancellation
  {
    userId: undefined as any,
    isAnonymous: false,
    status: 'REJECTED',
    type: 'CANCELLED',
    transportMode: 'TRAIN',
    routeShortName: 'SK2',
    gtfsRouteId: 'SK2',
    comment: 'SK2 train appears to be cancelled but no official info',
    verificationScore: 0.3,
    upvotes: 0,
    downvotes: 5,
    voteScore: -5,
    location: {
      type: 'Point',
      coordinates: [19.9043, 50.0923], // Near Zielonki
    },
  },
]
