import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createAuthForMutation } from "./auth";

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = createAuthForMutation(ctx);
    const result = await auth.api.signUpEmail({
      body: args,
    });
    return result;
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = createAuthForMutation(ctx);
    const result = await auth.api.signInEmail({
      body: args,
    });
    return result;
  },
});

export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = createAuthForMutation(ctx);
    const result = await auth.api.signOut({});
    return result;
  },
});

export const getSession = query({
  args: {},
  handler: async (ctx) => {
    // For now, return null since session management needs proper headers
    // TODO: Implement proper session management with headers
    return null;
  },
});