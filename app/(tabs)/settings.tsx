import { formatSubscriptionDateTime, getInitials } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { clsx } from "clsx";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function Settings() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const displayName = user?.fullName ?? user?.firstName ?? "Your account";
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email on file";
  const memberSince = formatSubscriptionDateTime(
    user?.createdAt?.toISOString(),
  );

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          await signOut();
          router.replace("/(auth)/sign-in" as any);
        },
      },
    ]);
  }, [signOut, router]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="settings-header">
          <Text className="settings-title">Settings</Text>
        </View>

        {/* Profile */}
        <View className="settings-profile-card">
          {user?.hasImage ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="settings-avatar"
            />
          ) : (
            <View className="settings-avatar-fallback">
              <Text className="settings-avatar-fallback-text">
                {getInitials(displayName)}
              </Text>
            </View>
          )}
          <View className="settings-profile-copy">
            <Text className="settings-profile-name" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="settings-profile-email" numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        {/* Account details */}
        <View className="settings-section">
          <Text className="settings-section-title">Account details</Text>
          <View className="settings-info-card">
            <View className="settings-info-row">
              <View className="settings-info-icon">
                <Ionicons
                  name="person-outline"
                  size={18}
                  color="#081126"
                />
              </View>
              <View className="settings-info-copy">
                <Text className="settings-info-label">Full name</Text>
                <Text className="settings-info-value" numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </View>

            <View className="settings-info-row">
              <View className="settings-info-icon">
                <Ionicons name="mail-outline" size={18} color="#081126" />
              </View>
              <View className="settings-info-copy">
                <Text className="settings-info-label">Email address</Text>
                <Text className="settings-info-value" numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>

            <View className="settings-info-row">
              <View className="settings-info-icon">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#081126"
                />
              </View>
              <View className="settings-info-copy">
                <Text className="settings-info-label">Member since</Text>
                <Text className="settings-info-value" numberOfLines={1}>
                  {memberSince}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Session */}
        <View className="settings-section">
          <Text className="settings-section-title">Session</Text>
          <Pressable
            className={clsx(
              "settings-signout-button",
              isSigningOut && "settings-signout-button-disabled",
            )}
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                <Text className="settings-signout-text">Sign out</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
