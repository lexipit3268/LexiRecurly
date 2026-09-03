import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import {
  HOME_BALANCE,
  HOME_SUBSCRIPTIONS,
  HOME_USER,
  UPCOMING_SUBSCRIPTIONS,
} from "@/constants/data";
import { icons } from "@/constants/icons";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { FlatList, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView as RNSafreAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafreAreaView);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="home-header">
          <View className="home-user">
            <Image
              source={{
                uri: "https://avatars.githubusercontent.com/u/62460969?s=512&v=4",
              }}
              className="home-avatar"
            />
            <Text className="home-user-name">{HOME_USER.name}</Text>
          </View>
          <Image source={icons.add} className="home-add-icon" />
        </View>

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
              <Text className="home-empty-state">
                No upcoming subscriptions
              </Text>
            }
          />
        </View>
        <View>
          <ListHeading title="All Subscription" />

          <SubscriptionCard {...HOME_SUBSCRIPTIONS[0]} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
