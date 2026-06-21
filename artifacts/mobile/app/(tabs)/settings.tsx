import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
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
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/GlassCard";

const TIER_COLORS: Record<string, string> = {
  free: "#8090A8",
  pro: "#1A8CFF",
  agency: "#8844E0",
  enterprise: "#00E5E5",
};

interface SettingRow {
  icon: string;
  sfSymbol: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  accent?: string;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const { user, logout } = useAuth();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const tierColor = TIER_COLORS[user?.subscriptionTier ?? "free"] ?? colors.primary;

  function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const accountRows: SettingRow[] = [
    {
      icon: "user",
      sfSymbol: "person",
      label: "Name",
      value: user?.name ?? "—",
    },
    {
      icon: "mail",
      sfSymbol: "envelope",
      label: "Email",
      value: user?.email ?? "—",
    },
    {
      icon: "star",
      sfSymbol: "star",
      label: "Plan",
      value: (user?.subscriptionTier ?? "free").toUpperCase(),
      accent: tierColor,
    },
    {
      icon: "zap",
      sfSymbol: "bolt",
      label: "Credits",
      value: String(user?.credits ?? 0),
      accent: colors.accent,
    },
  ];

  const Row = ({ row }: { row: SettingRow }) => (
    <TouchableOpacity
      style={[styles.row]}
      onPress={row.onPress}
      activeOpacity={row.onPress ? 0.7 : 1}
      disabled={!row.onPress}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: (row.accent ?? colors.primary) + "20" },
        ]}
      >
        {isIOS ? (
          <SymbolView
            name={row.sfSymbol as any}
            size={15}
            tintColor={row.destructive ? colors.destructive : (row.accent ?? colors.primary)}
          />
        ) : (
          <Feather
            name={row.icon as any}
            size={15}
            color={row.destructive ? colors.destructive : (row.accent ?? colors.primary)}
          />
        )}
      </View>
      <Text
        style={[
          styles.rowLabel,
          { color: row.destructive ? colors.destructive : colors.foreground },
        ]}
      >
        {row.label}
      </Text>
      <View style={styles.rowRight}>
        {row.value && (
          <Text style={[styles.rowValue, { color: row.accent ?? colors.mutedForeground }]}>
            {row.value}
          </Text>
        )}
        {row.onPress && (
          isIOS ? (
            <SymbolView name="chevron.right" size={12} tintColor={colors.mutedForeground} />
          ) : (
            <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
          )
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.section}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      {/* Profile avatar */}
      <View style={styles.section}>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary + "50" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.name ?? "User"}
            </Text>
            <View style={styles.tierPill}>
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
              <Text style={[styles.tierLabel, { color: tierColor }]}>
                {(user?.subscriptionTier ?? "free").toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {accountRows.map((row, i) => (
            <View key={row.label}>
              <Row row={row} />
              {i < accountRows.length - 1 && (
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </GlassCard>
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Platform</Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {[
            {
              icon: "globe",
              sfSymbol: "globe",
              label: "Website",
              value: "starksglobalgroup.net",
            } as SettingRow,
            {
              icon: "info",
              sfSymbol: "info.circle",
              label: "Version",
              value: "1.0.0",
            } as SettingRow,
          ].map((row, i, arr) => (
            <View key={row.label}>
              <Row row={row} />
              {i < arr.length - 1 && (
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </GlassCard>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.destructive + "40", backgroundColor: colors.destructive + "10" }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          {isIOS ? (
            <SymbolView name="rectangle.portrait.and.arrow.right" size={18} tintColor={colors.destructive} />
          ) : (
            <Feather name="log-out" size={18} color={colors.destructive} />
          )}
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
  },
  profileInfo: { gap: 6 },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
