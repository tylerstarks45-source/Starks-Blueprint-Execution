import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
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
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityItem, type ActivityEvent } from "@/components/ActivityItem";

interface SystemDetail {
  id: number;
  name: string;
  buildStatus: string;
  healthStatus: string;
  blueprintId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface BuildStep {
  id: number;
  stepNumber: number;
  title: string;
  status: string;
  notes: string | null;
}

interface RevSummary {
  todayCents: number;
  weekCents: number;
  monthCents: number;
  lifetimeCents: number;
}

function fmt(cents: number) {
  if (cents === 0) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SystemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const isIOS = Platform.OS === "ios";

  const { data: system, isLoading, refetch } = useQuery<SystemDetail>({
    queryKey: ["system", id],
    queryFn: () => apiFetch<SystemDetail>(`/system-instances/${id}`),
    enabled: !!id,
  });

  const { data: activity } = useQuery<ActivityEvent[]>({
    queryKey: ["system-activity", id],
    queryFn: () =>
      apiFetch<ActivityEvent[]>(`/system-instances/${id}/events?limit=8`),
    enabled: !!id,
    staleTime: 15_000,
  });

  const pauseMutation = useMutation({
    mutationFn: (pause: boolean) =>
      apiFetch(`/system-instances/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ buildStatus: pause ? "paused" : "active" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system", id] });
      queryClient.invalidateQueries({ queryKey: ["system-instances"] });
    },
  });

  function handlePauseResume() {
    if (!system) return;
    const isPaused = system.buildStatus === "paused";
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      isPaused ? "Resume System" : "Pause System",
      isPaused
        ? "Resume this automated system?"
        : "Pause this system? It will stop processing until resumed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isPaused ? "Resume" : "Pause",
          style: isPaused ? "default" : "destructive",
          onPress: () => pauseMutation.mutate(!isPaused),
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!system) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          System not found
        </Text>
      </View>
    );
  }

  const canPauseResume =
    system.buildStatus === "active" ||
    system.buildStatus === "completed" ||
    system.buildStatus === "paused";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : Platform.OS === "android" ? 96 : 89) }}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* System header */}
      <View style={styles.section}>
        <View style={styles.sysHeader}>
          <View style={styles.sysHeaderLeft}>
            <Text style={[styles.sysName, { color: colors.foreground }]}>{system.name}</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <StatusBadge status={system.buildStatus} />
              <StatusBadge status={system.healthStatus} />
            </View>
          </View>
          {canPauseResume && (
            <TouchableOpacity
              style={[
                styles.pauseBtn,
                {
                  backgroundColor:
                    system.buildStatus === "paused"
                      ? colors.success + "20"
                      : colors.muted,
                  borderColor:
                    system.buildStatus === "paused"
                      ? colors.success + "60"
                      : colors.border,
                },
              ]}
              onPress={handlePauseResume}
              disabled={pauseMutation.isPending}
              activeOpacity={0.7}
            >
              {pauseMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isIOS ? (
                <SymbolView
                  name={system.buildStatus === "paused" ? "play.fill" : "pause.fill"}
                  size={16}
                  tintColor={system.buildStatus === "paused" ? colors.success : colors.foreground}
                />
              ) : (
                <Feather
                  name={system.buildStatus === "paused" ? "play" : "pause"}
                  size={16}
                  color={system.buildStatus === "paused" ? colors.success : colors.foreground}
                />
              )}
              <Text
                style={[
                  styles.pauseBtnText,
                  {
                    color:
                      system.buildStatus === "paused" ? colors.success : colors.foreground,
                  },
                ]}
              >
                {system.buildStatus === "paused" ? "Resume" : "Pause"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.createdAt, { color: colors.mutedForeground }]}>
          Created {formatDate(system.createdAt)}
        </Text>
      </View>

      {/* ASH chat button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.ashBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
          onPress={() => router.push("/(tabs)/build")}
          activeOpacity={0.8}
        >
          {isIOS ? (
            <SymbolView name="sparkles" size={18} tintColor={colors.primary} />
          ) : (
            <Feather name="zap" size={18} color={colors.primary} />
          )}
          <Text style={[styles.ashBtnText, { color: colors.primary }]}>
            Ask ASH about this system
          </Text>
          {isIOS ? (
            <SymbolView name="chevron.right" size={13} tintColor={colors.primary} />
          ) : (
            <Feather name="chevron-right" size={13} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Recent Activity
        </Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {!activity?.length ? (
            <View style={styles.emptyActivity}>
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
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 16 },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sysHeaderLeft: { flex: 1, gap: 8 },
  sysName: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  createdAt: {
    fontSize: 12,
    marginTop: 6,
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pauseBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  ashBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  ashBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  emptyActivity: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: { fontSize: 14 },
  divider: { height: 1, marginHorizontal: 14 },
});
