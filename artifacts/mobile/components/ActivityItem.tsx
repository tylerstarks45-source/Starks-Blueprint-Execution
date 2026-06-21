import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useColors } from "@/hooks/useColors";

export interface ActivityEvent {
  id: number;
  eventType: string;
  title?: string | null;
  description?: string | null;
  amountCents?: number | null;
  createdAt: string;
}

interface ActivityItemProps {
  event: ActivityEvent;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type EventIconConfig = { name: string; color: string; sfSymbol: string };

function getEventConfig(eventType: string, colors: ReturnType<typeof useColors>): EventIconConfig {
  switch (eventType) {
    case "revenue":
      return { name: "trending-up", color: colors.success, sfSymbol: "arrow.up.right" };
    case "error":
      return { name: "alert-circle", color: colors.destructive, sfSymbol: "exclamationmark.circle" };
    case "build":
      return { name: "tool", color: colors.primary, sfSymbol: "hammer" };
    case "lead":
      return { name: "user-plus", color: colors.accent, sfSymbol: "person.badge.plus" };
    case "content":
      return { name: "file-text", color: colors.secondary, sfSymbol: "doc.text" };
    default:
      return { name: "activity", color: colors.mutedForeground, sfSymbol: "dot.radiowaves.left.and.right" };
  }
}

export function ActivityItem({ event }: ActivityItemProps) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const config = getEventConfig(event.eventType, colors);

  const title = event.title ?? event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
  const desc = event.description ?? "";

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: config.color + "20" }]}>
        {isIOS ? (
          <SymbolView name={config.sfSymbol as any} size={14} tintColor={config.color} />
        ) : (
          <Feather name={config.name as any} size={14} color={config.color} />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
            {event.eventType === "revenue" && event.amountCents
              ? ` · $${(event.amountCents / 100).toFixed(2)}`
              : ""}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(event.createdAt)}
          </Text>
        </View>
        {!!desc && (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {desc}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  time: {
    fontSize: 11,
    flexShrink: 0,
  },
  desc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
