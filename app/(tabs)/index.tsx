import { Href, Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafreAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafreAreaView);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="text-7xl font-sans-extrabold">Hello</Text>
      <Link
        href={"/onboarding"}
        className="px-6 py-4 rounded-md bg-primary font-sans-bold text-white"
      >
        Go to OnBoarding
      </Link>
      <Link
        href={"/sign-in"}
        className="px-6 py-4 rounded-md bg-primary font-sans-bold text-white"
      >
        Go to SignIn
      </Link>
      <Link
        href={"/subscriptions/spotify" as Href}
        className="px-6 py-4 rounded-md bg-primary font-sans-bold text-white"
      >
        Go to Spotify
      </Link>
    </SafeAreaView>
  );
}
