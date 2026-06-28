import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";
import { StatCard } from "@/components/StatCard";
import { ActivityItem, type ActivityEvent } from "@/components/ActivityItem";

interface RevenueSummary {
  todayCents: number;
  weekCents: number;
  monthCents: number;
  lifetimeCents: number;
  systemCount: number;
}

interface SystemHealth {
  id: number;
  name: string;
  buildStatus: string;
  healthStatus: string;
  healthScore: number;
  lifetimeCents: number;
  todayCents: number;
  weekRevCents: number;
}

interface PerformanceData {
  systems: SystemHealth[];
  contentPublished: number;
  leadsCaptured: number;
}

function fmt(cents: number) {
  if (cents === 0) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function greeting(name: string | null) {
  const h = new Date().getHours();
  const time = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${time}${name ? `, ${name.split(" ")[0]}` : ""}`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  const {
    data: revenue,
    isLoading: loadingRevenue,
    refetch: refetchRevenue,
  } = useQuery<RevenueSummary>({
    queryKey: ["revenue-summary"],
    queryFn: () => apiFetch<RevenueSummary>("/dashboard/revenue-summary"),
    staleTime: 30_000,
  });

  const {
    data: perf,
    isLoading: loadingPerf,
    refetch: refetchPerf,
  } = useQuery<PerformanceData>({
    queryKey: ["dashboard-performance"],
    queryFn: () => apiFetch<PerformanceData>("/dashboard/performance"),
    staleTime: 30_000,
  });

  const {
    data: activity,
    isLoading: loadingActivity,
    refetch: refetchActivity,
  } = useQuery<ActivityEvent[]>({
    queryKey: ["activity"],
    queryFn: () => apiFetch<ActivityEvent[]>("/system-instances/activity?limit=10"),
    staleTime: 15_000,
  });

  const isLoading = loadingRevenue || loadingPerf;

  function onRefresh() {
    refetchRevenue();
    refetchPerf();
    refetchActivity();
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 24 }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greeting(user?.name ?? null)}
          </Text>
          <Text style={[styles.subGreeting, { color: colors.mutedForeground }]}>
            Your systems are working for you
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.creditBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Feather name="zap" size={12} color={colors.accent} />
          <Text style={[styles.creditText, { color: colors.foreground }]}>
            {user?.credits ?? "—"} cr
          </Text>
        </TouchableOpacity>
      </View>

      {/* ASH Capabilities Banner */}
      <View style={styles.ashBanner}>
        <TouchableOpacity
          style={[styles.ashBannerInner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
          onPress={() => router.push("/(tabs)/build")}
          activeOpacity={0.85}
        >
          <View style={[styles.ashDot, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Feather name="zap" size={14} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ashBannerTitle, { color: colors.foreground }]}>ASH can do anything</Text>
            <Text style={[styles.ashBannerSub, { color: colors.mutedForeground }]}>Chat · Build · Create · Automate — all in one place</Text>
          </View>
          <Feather name="arrow-right" size={15} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Main earnings card */}
      <View style={styles.section}>
        <GlassCard style={styles.earningsCard}>
          <Text style={[styles.earningsLabel, { color: colors.mutedForeground }]}>
            Lifetime Earnings
          </Text>
          {loadingRevenue ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
          ) : (
            <Text style={[styles.earningsValue, { color: colors.foreground }]}>
              {fmt(revenue?.lifetimeCents ?? 0)}
            </Text>
          )}
          <View style={styles.earningsRow}>
            <View style={styles.earningsChip}>
              <Text style={[styles.earningsChipLabel, { color: colors.mutedForeground }]}>Today</Text>
              <Text style={[styles.earningsChipValue, { color: colors.accent }]}>
                {fmt(revenue?.todayCents ?? 0)}
              </Text>
            </View>
            <View style={[styles.earningsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.earningsChip}>
              <Text style={[styles.earningsChipLabel, { color: colors.mutedForeground }]}>7 days</Text>
              <Text style={[styles.earningsChipValue, { color: colors.foreground }]}>
                {fmt(revenue?.weekCents ?? 0)}
              </Text>
            </View>
            <View style={[styles.earningsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.earningsChip}>
              <Text style={[styles.earningsChipLabel, { color: colors.mutedForeground }]}>Month</Text>
              <Text style={[styles.earningsChipValue, { color: colors.foreground }]}>
                {fmt(revenue?.monthCents ?? 0)}
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* Stats row */}
      <View style={[styles.section, styles.statsRow]}>
        <StatCard
          label="Systems"
          value={String(revenue?.systemCount ?? 0)}
          subValue="active automations"
          accentColor={colors.primary}
          icon={<Feather name="cpu" size={14} color={colors.primary} />}
        />
        <StatCard
          label="Content"
          value={String(perf?.contentPublished ?? 0)}
          subValue="published pieces"
          accentColor={colors.secondary}
          icon={<Feather name="file-text" size={14} color={colors.secondary} />}
        />
        <StatCard
          label="Leads"
          value={String(perf?.leadsCaptured ?? 0)}
          subValue="captured"
          accentColor={colors.accent}
          icon={<Feather name="users" size={14} color={colors.accent} />}
        />
      </View>

      {/* Activity Feed */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Activity
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/systems/")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {loadingActivity ? (
            <View style={styles.feedLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !activity?.length ? (
            <View style={styles.emptyFeed}>
              <Feather name="activity" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No activity yet
              </Text>
            </View>
          ) : (
            activity.map((event, i) => (
              <View key={`${event.id}-${i}`}>
                <View style={{ padding: 14 }}>
                  <ActivityItem event={event} />
                </View>
                {i < activity.length - 1 && (
                  <View style={[styles.feedDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))
          )}
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 2,
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  creditText: {
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  earningsCard: {},
  earningsLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 12,
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  earningsChip: { gap: 2 },
  earningsChipLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  earningsChipValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  earningsDivider: {
    width: 1,
    height: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500",
  },
  feedLoader: {
    padding: 32,
    alignItems: "center",
  },
  emptyFeed: {
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },
  feedDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  ashBanner: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ashBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ashDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
  ashBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  ashBannerSub: {
    fontSize: 12,
    marginTop: 1,
  },
});
