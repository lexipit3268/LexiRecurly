import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const SignUp = () => {
  return (
    <View>
      <Text>SignUp</Text>
      <Link
        href={"/"}
        className="px-6 max-w-fit py-4 rounded-md bg-slate-700 text-white"
      >
        Go home
      </Link>
      <Link
        href={"/sign-in"}
        className="px-6 max-w-fit py-4 rounded-md bg-slate-700 text-white"
      >
        Go to SignIn
      </Link>
    </View>
  );
};

export default SignUp;
