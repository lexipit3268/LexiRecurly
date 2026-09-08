import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import {
  HOME_BALANCE,
  HOME_SUBSCRIPTIONS,
  UPCOMING_SUBSCRIPTIONS,
} from "@/constants/data";
import { icons } from "@/constants/icons";
import { formatCurrency, getInitials } from "@/lib/utils";
import { useUser } from "@clerk/expo";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Text, View } from "react-native";
import { SafeAreaView as RNSafreAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafreAreaView);

function HomeHeader() {
  const { user } = useUser();

  const displayName = user?.fullName ?? user?.firstName ?? "there";

  return (
    <View className="home-header">
      <View className="home-user">
        {user?.hasImage ? (
          <Image source={{ uri: user.imageUrl }} className="home-avatar" />
        ) : (
          <View className="home-avatar home-avatar-fallback">
            <Text className="home-avatar-fallback-text">
              {getInitials(displayName)}
            </Text>
          </View>
        )}
        <Text className="home-user-name">{displayName}</Text>
      </View>
      <Image source={icons.add} className="home-add-icon" />
    </View>
  );
}

const upperHome = () => (
  <>
    <HomeHeader />

    <View className="home-balance-card">
      <Text className="home-balance-label">Balance</Text>
      <View className="home-balance-row">
        <Text className="home-balance-amount">
          {formatCurrency(HOME_BALANCE.amount)}
        </Text>
        <Text className="home-balance-date">
          {dayjs(HOME_BALANCE.nextRenewalDate).format("MM/DD")}
        </Text>
      </View>
    </View>

    <View>
      <ListHeading title="Upcoming" />
      <FlatList
        data={UPCOMING_SUBSCRIPTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UpcomingSubscriptionCard {...item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">No upcoming subscriptions</Text>
        }
      />
    </View>
    <ListHeading title="All Subscription" />
  </>
);

export default function App() {
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<
    string | null
  >(null);

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <FlatList
        ListHeaderComponent={upperHome}
        data={HOME_SUBSCRIPTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            {...item}
            expanded={expandedSubscriptionId === item.id}
            onPress={() =>
              setExpandedSubscriptionId((currentId) =>
                currentId === item.id ? null : item.id,
              )
            }
          />
        )}
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={() => <View className="h-4"></View>}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text className="home-empty-state">No subscriptions.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </SafeAreaView>
  );
}
