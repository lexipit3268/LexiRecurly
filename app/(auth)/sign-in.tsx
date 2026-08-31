import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SignIn = () => {
  return (
    <View>
      <Text>SignIn</Text>
      <Link
        href={"/"}
        className="px-6 max-w-fit py-4 rounded-md bg-slate-700 text-white"
      >
        Go home
      </Link>
      <Link
        href={"/sign-up"}
        className="px-6 max-w-fit py-4 rounded-md bg-slate-700 text-white"
      >
        Go to SignUp
      </Link>
    </View>
  );
};

export default SignIn;
