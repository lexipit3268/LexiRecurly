import { Link, useGlobalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SubscriptionDetails = () => {
  const { id } = useGlobalSearchParams();
  return (
    <View>
      <Text>SubscriptionDetails</Text>
      <Text>This is subscription for {id}</Text>
      <Link
        href={"/"}
        className="px-6 max-w-fit py-4 rounded-md bg-slate-700 text-white"
      >
        Go home
      </Link>
    </View>
  );
};

export default SubscriptionDetails;
