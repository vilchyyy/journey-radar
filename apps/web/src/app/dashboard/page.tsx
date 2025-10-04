"use client";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { api } from "@journey-radar/backend/convex/_generated/api";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import { useState } from "react";

export default function DashboardPage() {
	const [showSignIn, setShowSignIn] = useState(false);
	const privateData = useQuery(api.privateData.get);

	return (
		<>
			<Authenticated>
				<div>
					<h1>Dashboard</h1>
					<p>privateData: {privateData?.message}</p>
					<UserMenu />
				</div>
			</Authenticated>
			<Unauthenticated>
				{showSignIn ? (
					<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
				) : (
					<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
				)}
			</Unauthenticated>
			<AuthLoading>
				<div>Loading...</div>
			</AuthLoading>
		</>
	);
}
