import { formatCurrency, formatSubscriptionDateTime } from "@/lib/utils";
import React from "react";
import { Image, Text, View } from "react-native";

const SubscriptionCard = ({
  icon,
  name,
  plan,
  category,
  paymentMethod,
  status,
  startDate,
  price,
  currency,
  billing,
  renewalDate,
  color,
}: SubscriptionCardProps) => {
  return (
    <View
      className="sub-card bg-card"
      style={color ? { backgroundColor: color } : ""}
    >
      <View className="sub-head">
        <View className="sub-main">
          <Image source={icon} className="sub-icon" />
          <View className="sub-copy">
            <Text numberOfLines={1} className="sub-title">
              {name}
            </Text>
            <Text className="sub-meta" numberOfLines={1} ellipsizeMode="tail">
              {category?.trim() ||
                plan?.trim() ||
                (renewalDate ? formatSubscriptionDateTime(renewalDate) : "")}
            </Text>
          </View>
        </View>
        <View className="sub-price-box">
          <Text className="sub-price">{formatCurrency(price, currency)}</Text>
          <Text className="sub-billing">{billing}</Text>
        </View>
      </View>
    </View>
  );
};

export default SubscriptionCard;
