import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/GlassCard";
import { apiFetch } from "@/lib/api";

const TIER_COLORS: Record<string, string> = {
  free: "#8090A8",
  pro: "#1A8CFF",
  agency: "#8844E0",
  enterprise: "#00E5E5",
  founder: "#F5A623",
};

const TIER_FEATURES: Record<string, string[]> = {
  free: ["5 credits/month", "3 system instances", "Basic blueprints"],
  pro: ["100 credits/month", "10 system instances", "All blueprints", "Priority support"],
  agency: ["500 credits/month", "Unlimited systems", "White-label", "API access"],
  enterprise: ["Unlimited credits", "Custom instances", "Dedicated support", "SLA"],
  founder: ["Unlimited access", "All features", "Admin panel"],
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

interface NotifPrefs {
  notifyRevenue: boolean;
  notifyMilestone: boolean;
  notifyBuild: boolean;
  notifyPlatform: boolean;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const { user, logout } = useAuth();

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    notifyRevenue: true,
    notifyMilestone: true,
    notifyBuild: true,
    notifyPlatform: false,
  });
  const [prefsSaving, setPrefsSaving] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const tier = user?.subscriptionTier ?? "free";
  const tierColor = TIER_COLORS[tier] ?? colors.primary;

  // Load notification prefs from user object (returned by /api/auth/me)
  useEffect(() => {
    if (!user) return;
    const u = user as unknown as Record<string, unknown>;
    setNotifPrefs({
      notifyRevenue:  typeof u.notifyRevenue  === "boolean" ? u.notifyRevenue  : true,
      notifyMilestone: typeof u.notifyMilestone === "boolean" ? u.notifyMilestone : true,
      notifyBuild:    typeof u.notifyBuild    === "boolean" ? u.notifyBuild    : true,
      notifyPlatform: typeof u.notifyPlatform  === "boolean" ? u.notifyPlatform  : false,
    });
  }, [user]);

  async function updatePref(key: keyof NotifPrefs, value: boolean) {
    Haptics.selectionAsync();
    setNotifPrefs((p) => ({ ...p, [key]: value }));
    if (prefsSaving) return;
    setPrefsSaving(true);
    try {
      await apiFetch("/auth/notification-prefs", {
        method: "PATCH",
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      setNotifPrefs((p) => ({ ...p, [key]: !value }));
    } finally {
      setPrefsSaving(false);
    }
  }

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

  async function handleManagePlan() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    const url = `${domain.startsWith("http") ? domain : `https://${domain}`}/settings?tab=billing`;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }

  async function handleUpgrade() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
    const url = `${domain.startsWith("http") ? domain : `https://${domain}`}/pricing`;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  }

  function handleCancelPlan() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Cancel Subscription",
      "You'll lose access to paid features at the end of your billing cycle. Are you sure?",
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Plan",
          style: "destructive",
          onPress: handleManagePlan,
        },
      ]
    );
  }

  const walletBalance = ((user as unknown as Record<string, unknown>)?.walletBalance as number) ?? 0;

  const accountRows: SettingRow[] = [
    { icon: "user", sfSymbol: "person", label: "Name", value: user?.name ?? "—" },
    { icon: "mail", sfSymbol: "envelope", label: "Email", value: user?.email ?? "—" },
    { icon: "star", sfSymbol: "star", label: "Plan", value: tier.toUpperCase(), accent: tierColor },
    { icon: "zap", sfSymbol: "bolt", label: "Credits", value: String(user?.credits ?? 0), accent: colors.accent },
    ...(walletBalance > 0 ? [{ icon: "dollar-sign", sfSymbol: "dollarsign.circle", label: "Wallet", value: `$${(walletBalance / 100).toFixed(2)}`, accent: colors.success } as SettingRow] : []),
  ];

  const Row = ({ row }: { row: SettingRow }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={row.onPress}
      activeOpacity={row.onPress ? 0.7 : 1}
      disabled={!row.onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: (row.accent ?? colors.primary) + "20" }]}>
        {isIOS ? (
          <SymbolView name={row.sfSymbol as any} size={15} tintColor={row.destructive ? colors.destructive : (row.accent ?? colors.primary)} />
        ) : (
          <Feather name={row.icon as any} size={15} color={row.destructive ? colors.destructive : (row.accent ?? colors.primary)} />
        )}
      </View>
      <Text style={[styles.rowLabel, { color: row.destructive ? colors.destructive : colors.foreground }]}>{row.label}</Text>
      <View style={styles.rowRight}>
        {row.value && <Text style={[styles.rowValue, { color: row.accent ?? colors.mutedForeground }]}>{row.value}</Text>}
        {row.onPress && (isIOS ? (
          <SymbolView name="chevron.right" size={12} tintColor={colors.mutedForeground} />
        ) : (
          <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
        ))}
      </View>
    </TouchableOpacity>
  );

  const notifItems = [
    { key: "notifyRevenue" as const,   label: "Revenue events",  sub: "New earnings from your systems" },
    { key: "notifyMilestone" as const, label: "Milestones",       sub: "When you hit earnings milestones" },
    { key: "notifyBuild" as const,     label: "Build updates",    sub: "Build completions and errors" },
    { key: "notifyPlatform" as const,  label: "Platform updates", sub: "New features and announcements" },
  ];

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

      {/* Profile */}
      <View style={styles.section}>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "30", borderColor: colors.primary + "50" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name ?? "User"}</Text>
            <View style={styles.tierPill}>
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
              <Text style={[styles.tierLabel, { color: tierColor }]}>{tier.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Account</Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {accountRows.map((row, i) => (
            <View key={row.label}>
              <Row row={row} />
              {i < accountRows.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </GlassCard>
      </View>

      {/* Billing */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Subscription & Billing</Text>
        <GlassCard style={{ gap: 14 }}>
          {/* Current plan */}
          <View style={[styles.planBanner, { backgroundColor: tierColor + "10", borderColor: tierColor + "30" }]}>
            <View style={[styles.planDot, { backgroundColor: tierColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: tierColor }]}>{tier.toUpperCase()} PLAN</Text>
              <Text style={[styles.planSub, { color: colors.mutedForeground }]}>
                {TIER_FEATURES[tier]?.join(" · ") ?? ""}
              </Text>
            </View>
          </View>

          {/* Credits bar */}
          <View style={styles.creditsRow}>
            <View style={styles.creditsInfo}>
              <Feather name="zap" size={14} color={colors.accent} />
              <Text style={[styles.creditsLabel, { color: colors.foreground }]}>Credits remaining</Text>
            </View>
            <Text style={[styles.creditsValue, { color: colors.accent }]}>{user?.credits ?? 0}</Text>
          </View>

          {/* Upgrade */}
          {tier !== "enterprise" && tier !== "founder" && (
            <TouchableOpacity
              style={[styles.upgradeBtnRow, { backgroundColor: colors.primary }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <Feather name="arrow-up-circle" size={16} color="#fff" />
              <Text style={styles.upgradeText}>Upgrade Plan</Text>
            </TouchableOpacity>
          )}

          {/* Manage */}
          <TouchableOpacity
            style={[styles.manageBtn, { borderColor: colors.border }]}
            onPress={handleManagePlan}
            activeOpacity={0.8}
          >
            {isIOS ? (
              <SymbolView name="creditcard" size={15} tintColor={colors.mutedForeground} />
            ) : (
              <Feather name="credit-card" size={15} color={colors.mutedForeground} />
            )}
            <Text style={[styles.manageBtnText, { color: colors.mutedForeground }]}>Manage Subscription</Text>
            <View style={{ flex: 1 }} />
            {isIOS ? (
              <SymbolView name="arrow.up.right.square" size={13} tintColor={colors.mutedForeground} />
            ) : (
              <Feather name="external-link" size={13} color={colors.mutedForeground} />
            )}
          </TouchableOpacity>

          {/* Cancel — only show for paid plans */}
          {tier !== "free" && tier !== "founder" && (
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.destructive + "30" }]}
              onPress={handleCancelPlan}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>Cancel Plan</Text>
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Push Notifications</Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {notifItems.map((item, i) => (
            <View key={item.key}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                </View>
                <Switch
                  value={notifPrefs[item.key]}
                  onValueChange={(v) => updatePref(item.key, v)}
                  trackColor={{ false: colors.muted, true: colors.primary + "80" }}
                  thumbColor={notifPrefs[item.key] ? colors.primary : colors.mutedForeground}
                />
              </View>
              {i < notifItems.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </GlassCard>
      </View>

      {/* Platform */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Platform</Text>
        <GlassCard padding={0} style={{ overflow: "hidden" }}>
          {([
            { icon: "globe", sfSymbol: "globe", label: "Website", value: "starksglobalgroup.net" },
            { icon: "info", sfSymbol: "info.circle", label: "Version", value: "1.0.0" },
          ] as SettingRow[]).map((row, i, arr) => (
            <View key={row.label}>
              <Row row={row} />
              {i < arr.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
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
  section: { paddingHorizontal: 20, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  profile: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontWeight: "700" },
  profileInfo: { gap: 6 },
  profileName: { fontSize: 20, fontWeight: "700" },
  tierPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  tierDot: { width: 7, height: 7, borderRadius: 4 },
  tierLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  sectionLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, fontWeight: "500" },
  rowDivider: { height: 1, marginHorizontal: 16 },
  planBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  planDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  planName: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  planSub: { fontSize: 11, marginTop: 2 },
  creditsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  creditsInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  creditsLabel: { fontSize: 14 },
  creditsValue: { fontSize: 16, fontWeight: "700" },
  upgradeBtnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 46, borderRadius: 12, gap: 8 },
  upgradeText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  manageBtn: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  manageBtnText: { fontSize: 14 },
  cancelBtn: { alignItems: "center", justifyContent: "center", height: 40, borderRadius: 10, borderWidth: 1 },
  cancelBtnText: { fontSize: 13, fontWeight: "600" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  toggleLabel: { fontSize: 15, fontWeight: "500" },
  toggleSub: { fontSize: 11 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 16, fontWeight: "600" },
});
