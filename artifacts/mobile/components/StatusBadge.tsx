import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Status = "active" | "building" | "paused" | "failed" | "completed" | "healthy" | "unhealthy" | "pending" | string;

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const config: Record<string, { color: string; label: string }> = {
    active: { color: colors.success, label: "Active" },
    completed: { color: colors.success, label: "Completed" },
    healthy: { color: colors.success, label: "Healthy" },
    building: { color: colors.warning, label: "Building" },
    pending: { color: colors.warning, label: "Pending" },
    paused: { color: colors.mutedForeground, label: "Paused" },
    failed: { color: colors.destructive, label: "Failed" },
    unhealthy: { color: colors.destructive, label: "Unhealthy" },
  };

  const { color, label } = config[status] ?? { color: colors.mutedForeground, label: status };

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + "20",
          borderColor: color + "40",
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6 }]} />
      <Text style={[styles.label, { color, fontSize: isSmall ? 10 : 12 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: {
    borderRadius: 999,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
