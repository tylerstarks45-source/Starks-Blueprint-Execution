import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
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

type NotifIconConfig = { icon: string; sfSymbol: string; color: string };

function getNotifConfig(type: string, colors: ReturnType<typeof useColors>): NotifIconConfig {
  switch (type) {
    case "success":
      return { icon: "check-circle", sfSymbol: "checkmark.circle.fill", color: colors.success };
    case "warning":
      return { icon: "alert-triangle", sfSymbol: "exclamationmark.triangle.fill", color: colors.warning };
    case "error":
      return { icon: "x-circle", sfSymbol: "xmark.circle.fill", color: colors.destructive };
    case "revenue":
      return { icon: "trending-up", sfSymbol: "arrow.up.right", color: colors.accent };
    default:
      return { icon: "bell", sfSymbol: "bell.fill", color: colors.primary };
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const queryClient = useQueryClient();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  const { data, isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<Notification[]>("/notifications"),
    staleTime: 10_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.filter((n) => !n.read).length ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {data?.length ?? 0} total · {unreadCount} unread
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          scrollEnabled={!!(data?.length)}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell-off" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                All caught up
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                You have no notifications yet
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const config = getNotifConfig(item.type, colors);
            return (
              <TouchableOpacity
                style={[
                  styles.row,
                  {
                    backgroundColor: !item.read ? colors.primary + "06" : "transparent",
                  },
                ]}
                onPress={() => {
                  if (!item.read) {
                    Haptics.selectionAsync();
                    markReadMutation.mutate(item.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: config.color + "20" },
                  ]}
                >
                  {isIOS ? (
                    <SymbolView
                      name={config.sfSymbol as any}
                      size={16}
                      tintColor={config.color}
                    />
                  ) : (
                    <Feather
                      name={config.icon as any}
                      size={16}
                      color={config.color}
                    />
                  )}
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text
                      style={[
                        styles.notifTitle,
                        {
                          color: colors.foreground,
                          fontWeight: item.read ? "400" : "600",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.message, { color: colors.mutedForeground }]}
                    numberOfLines={2}
                  >
                    {item.message}
                  </Text>
                </View>
                {!item.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  sub: { fontSize: 13 },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 0,
  },
  sep: { height: 1, marginHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  content: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  notifTitle: { flex: 1, fontSize: 14 },
  time: { fontSize: 11 },
  message: { fontSize: 13, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyText: { fontSize: 14 },
});
