# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
bun install                    # Install dependencies
bun dev:setup                 # Setup and configure Convex project
bun dev                        # Start all applications in development mode
```

### Development
```bash
bun dev:web                   # Start only the web application (port 3001)
bun dev:server                # Start only the backend
bun check                      # Run Biome formatting and linting
bun check-types               # Check TypeScript types across all apps
bun build                     # Build all applications
```

### Convex Development
```bash
cd packages/backend
bunx convex dev               # Start Convex development server
bunx convex dashboard         # Open Convex dashboard
```

## Architecture Overview

This is a monorepo using Turborepo with a Next.js frontend and Convex backend for a public transport reporting system.

### Monorepo Structure
- `apps/web/` - Next.js frontend application with authentication
- `packages/backend/` - Convex backend with schema, functions, and geospatial capabilities

### Key Technologies
- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui, TanStack Form
- **Backend**: Convex with @convex-dev/geospatial for location-based queries
- **Authentication**: Better-Auth integrated with Convex
- **Maps**: MapLibre GL, react-map-gl (installed but not yet implemented)

### Data Model

The system tracks transport incidents with the following core entities:

**Users**: Basic user profiles with gamification points
**Reports**: User-submitted transport incident reports with:
- Location data (via geospatial indexing)
- Transport mode, line, destination
- Report type (DELAY, CANCELLED, CROWDED, ACCIDENT, OTHER)
- Status tracking (UNVERIFIED → COMMUNITY_VERIFIED → OFFICIAL_CONFIRMED/REJECTED)

**Incidents**: Official confirmed incidents from dispatchers/system
**Transports/Trips/Routes**: Transport network data structure

### Geospatial Implementation

The system uses `@convex-dev/geospatial` for location-based queries:

1. **Index Setup**: Geospatial index initialized in `packages/backend/convex/index.ts`
2. **Data Storage**: Reports stored in Convex table, locations inserted into geospatial index
3. **Queries**: Use `geospatial.queryNearest(ctx, center, radiusMeters, limit)` for radius searches
4. **Parameter Order**: Critical - `(ctx, center, radiusMeters, limit)` not `(ctx, center, limit, radius)`

### Authentication Flow

Uses Better-Auth with Convex integration:
- Auth client configured in `apps/web/src/lib/auth-client.ts`
- Auth server setup in `apps/web/src/app/api/auth/[...all]/route.ts`
- ConvexBetterAuthProvider wraps the app in `apps/web/src/components/providers.tsx`

### Form Handling

Frontend uses TanStack Form for robust form management with shadcn UI components. Pattern follows:
```tsx
const form = useForm({
  defaultValues: { ... },
  onSubmit: async ({ value }) => { ... }
})

// Form fields using children prop pattern
<form.Field name="fieldName" children={(field) => (
  <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
)} />
```

### Key Development Notes

- **Biome** used for linting and formatting instead of ESLint/Prettier
- **Package Manager**: Bun for all operations
- **Convex Functions**: All backend logic in `packages/backend/convex/` with separate files for different domains
- **Type Safety**: Strong TypeScript integration between frontend and backend via generated Convex types
- **Component Library**: shadcn/ui components installed via CLI, stored in `apps/web/src/components/ui/`

### Current Development State

The geospatial functionality is implemented but may need debugging for the `queryNearest` function. Use the `debugGeospatialIndex` function to troubleshoot if reports aren't showing up in location-based queries.

# IMPORTANT NOTES

Consider everything here when building the application

### Project Description
Delay Management Application
A system for managing passenger delay notifications currently presents a complex challenge,
particularly due to the multitude of interconnected elements that determine when and how
messages are published. In public transport, such as rail and bus services, there is a lack of
integrated information exchange, which makes communication ineffective and often fails to
meet the real-time needs of passengers.
Our proposal is to create a community-driven system where users can share information about
delays and disruptions. These data will be supplemented in real time by the system itself and
distributed to other users to help them better organize their journeys.
Key functionalities of the transport delay application:
• User-reported disruptions – passengers can report issues they encounter, and for
helpful submissions they receive points or other rewards. It is also important to
implement a mechanism for verifying reports.
• Prediction of future disruptions – based on historical data and current information,
the system analyzes and forecasts possible delays.
• Real-time delay information – the application delivers up-to-date delay details,
taking into account the timetable and the user’s location.
• Dispatcher systems – proposal of an interface (API) that allows seamless
communication with the dispatching systems of rail and bus operators.
• Maps and navigation – an interactive map displays current disruptions along routes,
enabling users to plan optimal connections

### Talk with organizer
Speaker 1: and collect the data about this and like inform you better. So, when there is like communication between another type of public transport, we see benefit. But if you feel comfortable to do it in one area, we are okay. Like we...
Speaker 2: But also the local trams and buses already have real-time delay information. So I don't see, I don't see a major benefit of doing like community-driven apps, like they already, the real-time GPS is tracked on the map and they are already updated in the existing systems. So...
Speaker 1: Yes, like we in Koleje Małopolskie, we also have real-time data. But the issue is if like you are not familiar with those area, like you are traveling from another country or you even from another area of the Poland, you don't know like which app or which system is the best or where you can find this data. So we in this exercise, we want to like check from another perspective what will happen if user will start to inform about this like each other. And I don't know if you know... We cannot use those name because that is like another app, but in the Poland we have Yanosik app. There is the most famous about the driving the road.
Speaker 2: Like Yanosik is used almost everywhere like setting where the cops are looking for...
Speaker 1: Yes, but also about delays. Yes. So, uh, but the issue is we would like to follow the same role, because as you said, so we have the systems, also like systems there is quite hard to integrate between each other. There is a lot of companies which are responsible for...
Speaker 2: So unified system only based on user communication. We should like, we should assume that we have no real-time data when designing this system, or?
Speaker 1: You can. You can assume like that you have those data, like some of company have those data, and companies can give those data to you, but just to like confirm it, and for the user who are doing like multiple stops between the travel, recommend the best way to travel.
Speaker 2: Okay, there is also the problem with prediction of delays by historic data. So I don't understand how would you do that so it's reliable because delays more often do not happen than they do. So how can you like predict the delays?
Speaker 1: You show, uh, maybe in the Google Maps when you see, you would like to like plan some destination, you can also check the time box when you would like to start it, and you have the visibility what was the traffic. So, like it's exactly the same way because, I don't know, around the 4 PM when is many users, like many travelers, uh, just to recommend the user that in this time box usually we have a lot of passengers so can some delays happen.
Speaker 2: Okay, so like we do not explicitly tell that there will be delay but we show some time schedule like from 15 to 30 minutes because...
Speaker 1: Exactly. Okay.
Speaker 2: And possible to adapt. I understand it.
Speaker 1: Yes.
Speaker 2: It's also here there is this like expose this dispatcher systems, expose of the interface API that allow seamless communication with the dispatching systems of rail and bus operators. We need to expose some API for...
Speaker 1: Yes, you can create some API where dispatchers can connect.
Speaker 2: And they put... this is the real-time data connection.
Speaker 1: Yes. Yes, like kind kind of communication. Not like location of the train, but this part they are kind of administrator of company who is contact with the trains when something happened. But also you can create some admin panel or API for this company to just have possibility to give some input to the application as a additional information.
Speaker 2: Okay, and what, what should the API expose? What should it allow them to do?
Speaker 1: For, number of the train, buses, time, and destination.
Speaker 2: Okay. So, besides assuming we have data about the buses, they can add new data or like say the bus is not running or something?
Speaker 1: Exactly, or there is some crash and there is possibility... Just communicate, kind of incidents to inform across the...
Speaker 2: Yes, okay, so these are like a source of truth. So like the user reporting community system, they are not like always true. We need to have more reports, but the dispatcher report something, this is the source of truth and if he says the train is not running, it's not running.
Speaker 1: Yes. In our opinion like dispatchers, communication from dispatchers have higher priority.
Speaker 2: Yeah, I understand.
Speaker 3: So you all like working like from your own app or is it just...
Speaker 1: No, no, we just want to check another point of view for the delays approach. Uh, because like we have our own, also as your friend said, like we have central system where we are presenting that, but generally we would like to see, uh, approach what will happen when users start to, uh, give those data about delays and like comparing with central one which help users to like have more comfortable travel. So just like include the users to collect the data about delays.
Speaker 3: Okay, so actually from the perspective of someone not coming from Poland, so like I just arrive here like for example yesterday and then I don't know like which app to use and then usually I just use Google Maps.
Speaker 1: I will, yes, on the presentation I will show some recommended app where kind of the data is visible, so most probably will help you. Sorry, but around two I have the workshop. So there also will be the possibility to talk. I see like it's kind of... for me. Okay.
Speaker 2: Okay, so last last question. This planning of the connections. Like there is like interactive map that displays current disruptions along the routes and helping users to plan optimal connections. So should we do something similar to like Google Maps like they are there so we just plan the... plan the connection using the data we have, but then comes the delays. So first point of truth should be I think getting the delay from the real like the real-time data and then if that's not available, there should be fallback to the community data.
Speaker 1: Or both. Like confirm like if you have multiple users on the train and something happened, and also you have connection with the train and like there is some incident. So also there is the case to create some algorithm to confirm if those issue are really happened. Like, I don't know, some our train crew, uh, like inform that something is happened, but and some user inform the app, but there is will be also we will take a look on that how to, uh, properly assess if those communication is proper or valid because can be some fake news as well.
Speaker 2: Okay, yeah. Dobre. Okay, I understand everything. Dziękuję. Powodzenia. Thank you.
Speaker 1: Thank you. Powodzenia.


# !IMPORTANTEST
DONT RUN DEV COMMANDS!!!
DONT RUN DEV COMMANDS!!!
DONT RUN DEV COMMANDS!!!
DONT RUN DEV COMMANDS!!!
DONT RUN DEV COMMANDS!!!
DONT RUN DEV COMMANDS!!!