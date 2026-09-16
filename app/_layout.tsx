import "@/global.css";
import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { ReactNode, useEffect, useRef } from "react";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { posthog } from "@/lib/posthog";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — add it to your .env file.",
  );
}

function PostHogIdentity({ children }: { children: ReactNode }) {
  const posthogClient = usePostHog();
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      if (identifiedUserId.current === user.id) return;

      posthogClient.identify(user.id, {
        $set: {
          ...(user.primaryEmailAddress?.emailAddress
            ? { email: user.primaryEmailAddress.emailAddress }
            : {}),
          ...(user.fullName ?? user.firstName
            ? { name: user.fullName ?? user.firstName }
            : {}),
        },
      });
      identifiedUserId.current = user.id;
      return;
    }

    if (identifiedUserId.current) {
      posthogClient.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, posthogClient, user]);

  return children;
}

export default function RootLayout() {
  const [fontsLoaded, fontLoadError] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontLoadError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontLoadError]);

  if (!fontsLoaded && !fontLoadError) {
    return null;
  }

  // ClerkProvider wraps the whole navigator.
  // index.tsx handles the isLoaded=false case with its own spinner,
  // so we do NOT need <ClerkLoaded> here — it would block all screen
  // rendering while Clerk reads the token from secure storage.
  const navigator = <Stack screenOptions={{ headerShown: false }} />;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {posthog ? (
        <PostHogProvider client={posthog}>
          <PostHogIdentity>{navigator}</PostHogIdentity>
        </PostHogProvider>
      ) : (
        navigator
      )}
    </ClerkProvider>
  );
}
