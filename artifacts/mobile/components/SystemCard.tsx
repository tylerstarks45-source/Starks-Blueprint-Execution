import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

export interface SystemItem {
  id: number;
  name: string;
  buildStatus: string;
  healthStatus: string;
  blueprintName?: string;
  todayCents?: number;
  weekRevCents?: number;
  lifetimeCents?: number;
  healthScore?: number;
}

interface SystemCardProps {
  system: SystemItem;
  onPress?: () => void;
}

function centsToDisplay(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 100) return `$0.${cents.toString().padStart(2, "0")}`;
  return `$${(cents / 100).toFixed(2)}`;
}

export function SystemCard({ system, onPress }: SystemCardProps) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {system.name}
          </Text>
          <StatusBadge status={system.buildStatus} size="sm" />
        </View>
        {system.blueprintName && (
          <Text style={[styles.blueprint, { color: colors.mutedForeground }]} numberOfLines={1}>
            {system.blueprintName}
          </Text>
        )}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Today</Text>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {centsToDisplay(system.todayCents ?? 0)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>7d</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {centsToDisplay(system.weekRevCents ?? 0)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Lifetime</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {centsToDisplay(system.lifetimeCents ?? 0)}
          </Text>
        </View>

        <View style={styles.chevron}>
          {isIOS ? (
            <SymbolView name="chevron.right" size={14} tintColor={colors.mutedForeground} />
          ) : (
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  blueprint: {
    fontSize: 12,
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stat: {
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 24,
  },
  chevron: {
    marginLeft: "auto",
  },
});
