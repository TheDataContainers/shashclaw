import posthog from "posthog-js";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

function PageTracker() {
  const [location] = useLocation();

  useEffect(() => {
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [location]);

  return null;
}

function UserIdentifier() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const user = meQuery.data;
    if (!user) {
      posthog.reset();
      return;
    }
    posthog.identify(user.openId, {
      email: user.email,
      role: user.role,
    });
  }, [meQuery.data]);

  return null;
}

export function PostHogProvider() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return null;
  return (
    <>
      <PageTracker />
      <UserIdentifier />
    </>
  );
}
