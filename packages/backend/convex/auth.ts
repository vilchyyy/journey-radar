import { components } from "./_generated/api";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { DataModel } from "./_generated/dataModel";

const siteUrl = process.env.SITE_URL || "http://localhost:3001";
const secret = process.env.BETTER_AUTH_SECRET || "better-auth-secret";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuthForQuery = (ctx: QueryCtx) =>
	betterAuth({
		secret,
		baseURL: siteUrl,
		logger: {
			disabled: false,
		},
		baseUrl: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		plugins: [convex()],
	});

export const createAuthForMutation = (ctx: MutationCtx) =>
	betterAuth({
		secret,
		baseURL: siteUrl,
		logger: {
			disabled: false,
		},
		baseUrl: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		plugins: [convex()],
	});

export const safeGetUser = async (ctx: QueryCtx) => {
	const auth = createAuthForQuery(ctx);
	return await auth.api.getSession({
		headers: new Headers(),
	});
};

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return safeGetUser(ctx);
	},
});
