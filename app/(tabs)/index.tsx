import "@/global.css";
import { Href, Link } from "expo-router";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center ">
      <Text className="text-xl font-bold text-blue-500">Hello</Text>
      <Link
        href={"/onboarding"}
        className="px-6 py-4 rounded-md bg-slate-700 text-white"
      >
        Go to OnBoarding
      </Link>
      <Link
        href={"/sign-in"}
        className="px-6 py-4 rounded-md bg-slate-700 text-white"
      >
        Go to SignIn
      </Link>
      <Link
        href={"/subscriptions/spotify" as Href}
        className="px-6 py-4 rounded-md bg-green-500 text-white"
      >
        Go to Spotify
      </Link>
    </View>
  );
}
