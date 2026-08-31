import { styled } from "nativewind";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView as RNSafreAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafreAreaView);

const Insights = () => {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text>Insights</Text>
    </SafeAreaView>
  );
};

export default Insights;
