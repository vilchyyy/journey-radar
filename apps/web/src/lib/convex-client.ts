import { ConvexHttpClient } from "convex/browser";
import { api } from "@journey-radar/backend/convex/_generated/api";

// Initialize Convex client for web app
export const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://localhost:3217"
);

export { api };