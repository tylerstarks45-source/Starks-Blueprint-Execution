import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subValue, accentColor, icon }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: (accentColor ?? colors.primary) + "20" }]}>
            {icon}
          </View>
        )}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {subValue !== undefined && (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{subValue}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
  },
});
