import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";

interface ToolCategory {
  id: number;
  name: string;
  slug: string;
}

interface Tool {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
  pricing: string | null;
  affiliateLink: string | null;
  websiteUrl: string | null;
  activeStatus: boolean;
  logoUrl: string | null;
}

interface UserCredential {
  id: number;
  toolId: number | null;
  credentialKey: string;
}

interface ConnectSheetProps {
  tool: Tool | null;
  onClose: () => void;
  onConnected: () => void;
  colors: ReturnType<typeof useColors>;
}

const CATEGORY_ICONS: Record<string, string> = {
  ai: "cpu",
  automation: "zap",
  content: "file-text",
  analytics: "bar-chart-2",
  email: "mail",
  payment: "credit-card",
  crm: "users",
  ecommerce: "shopping-bag",
};

// ─── Connect Sheet ────────────────────────────────────────────────────────────

function ConnectSheet({ tool, onClose, onConnected, colors }: ConnectSheetProps) {
  const [credKey, setCredKey] = useState("");
  const [credValue, setCredValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleConnect() {
    if (!tool || !credKey.trim() || !credValue.trim()) {
      Alert.alert("Missing fields", "Please enter both the credential key and value.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/user-credentials", {
        method: "POST",
        body: JSON.stringify({
          credentialKey: credKey.trim().toUpperCase().replace(/\s+/g, "_"),
          encryptedValue: credValue.trim(),
          toolId: tool.id,
          label: `${tool.name} — ${credKey.trim()}`,
        }),
      });
      onConnected();
      onClose();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save credential.");
    } finally {
      setSaving(false);
    }
  }

  if (!tool) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={sheet.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[sheet.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={sheet.handle} />
          <Text style={[sheet.title, { color: colors.foreground }]}>Connect {tool.name}</Text>
          <Text style={[sheet.sub, { color: colors.mutedForeground }]}>
            Enter your API key or access token to connect this tool to your account.
          </Text>

          <View style={sheet.field}>
            <Text style={[sheet.fieldLabel, { color: colors.mutedForeground }]}>Credential name (e.g. API_KEY)</Text>
            <TextInput
              style={[sheet.fieldInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              value={credKey}
              onChangeText={setCredKey}
              placeholder="e.g. OPENAI_API_KEY"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
            />
          </View>

          <View style={sheet.field}>
            <Text style={[sheet.fieldLabel, { color: colors.mutedForeground }]}>Value (kept encrypted)</Text>
            <TextInput
              style={[sheet.fieldInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              value={credValue}
              onChangeText={setCredValue}
              placeholder="Paste your key here"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
            />
          </View>

          {tool.websiteUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(tool.websiteUrl!).catch(() => {})} activeOpacity={0.7}>
              <Text style={[sheet.getKeyLink, { color: colors.primary }]}>
                Get your {tool.name} key →
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[sheet.connectBtn, { backgroundColor: colors.primary }]}
            onPress={handleConnect}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={sheet.connectBtnText}>Save & Connect</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={sheet.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[sheet.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  panel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 48, gap: 14 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#6B7A9960", alignSelf: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6 },
  fieldInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  getKeyLink: { fontSize: 13, fontWeight: "600" },
  connectBtn: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  connectBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 8 },
  cancelBtnText: { fontSize: 14 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [connectTool, setConnectTool] = useState<Tool | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  const { data: categories } = useQuery<ToolCategory[]>({
    queryKey: ["tool-categories"],
    queryFn: () => apiFetch<ToolCategory[]>("/tool-categories"),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, refetch } = useQuery<Tool[]>({
    queryKey: ["tools"],
    queryFn: () => apiFetch<Tool[]>("/tools"),
    staleTime: 60_000,
  });

  const { data: userCreds, refetch: refetchCreds } = useQuery<UserCredential[]>({
    queryKey: ["user-credentials"],
    queryFn: () => apiFetch<UserCredential[]>("/user-credentials"),
    staleTime: 30_000,
  });

  const connectedToolIds = useMemo(() => {
    if (!userCreds) return new Set<number>();
    return new Set(userCreds.map((c) => c.toolId).filter((id): id is number => id !== null));
  }, [userCreds]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((t) => {
      const matchSearch = !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCat || t.categoryId === selectedCat;
      return matchSearch && matchCat;
    });
  }, [data, search, selectedCat]);

  function openLink(url: string | null) {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Marketplace</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {data?.length ?? 0} curated tools · {connectedToolIds.size} connected
        </Text>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search tools…"
            placeholderTextColor={colors.mutedForeground}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, { backgroundColor: !selectedCat ? colors.primary : colors.muted, borderColor: !selectedCat ? colors.primary : colors.border }]}
            onPress={() => setSelectedCat(null)}
          >
            <Text style={[styles.chipText, { color: !selectedCat ? "#fff" : colors.mutedForeground }]}>All</Text>
          </TouchableOpacity>
          {categories?.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, { backgroundColor: selectedCat === cat.id ? colors.primary : colors.muted, borderColor: selectedCat === cat.id ? colors.primary : colors.border }]}
              onPress={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
            >
              <Text style={[styles.chipText, { color: selectedCat === cat.id ? "#fff" : colors.mutedForeground }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void refetch(); void refetchCreds(); }} tintColor={colors.primary} />}
          renderItem={({ item: tool }) => {
            const isConnected = connectedToolIds.has(tool.id);
            return (
              <GlassCard>
                <View style={styles.toolHeader}>
                  <View style={[styles.toolIcon, { backgroundColor: colors.secondary + "20", borderColor: colors.secondary + "30" }]}>
                    <Feather name={(CATEGORY_ICONS[tool.name?.toLowerCase().split(" ")[0] ?? ""] ?? "tool") as any} size={16} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.toolTitleRow}>
                      <Text style={[styles.toolName, { color: colors.foreground }]}>{tool.name}</Text>
                      {isConnected ? (
                        <View style={[styles.connectedBadge, { backgroundColor: colors.success + "20", borderColor: colors.success + "40" }]}>
                          <Feather name="check" size={9} color={colors.success} />
                          <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
                        </View>
                      ) : tool.activeStatus ? (
                        <View style={[styles.activeBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                          <Text style={[styles.activeText, { color: colors.primary }]}>Available</Text>
                        </View>
                      ) : null}
                    </View>
                    {tool.description && (
                      <Text style={[styles.toolDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {tool.description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Pricing + CTA */}
                <View style={[styles.toolFooter, { borderTopColor: colors.border }]}>
                  {tool.pricing && (
                    <View style={[styles.pricingBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.pricingText, { color: colors.foreground }]}>{tool.pricing}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  {tool.websiteUrl && (
                    <TouchableOpacity
                      style={[styles.linkBtn, { borderColor: colors.border }]}
                      onPress={() => openLink(tool.websiteUrl)}
                      activeOpacity={0.8}
                    >
                      <Feather name="external-link" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.linkBtnText, { color: colors.mutedForeground }]}>Website</Text>
                    </TouchableOpacity>
                  )}
                  {isConnected ? (
                    <View style={[styles.connectedBtn, { borderColor: colors.success + "40", backgroundColor: colors.success + "15" }]}>
                      <Feather name="check-circle" size={12} color={colors.success} />
                      <Text style={[styles.connectedBtnText, { color: colors.success }]}>Connected</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.connectBtn, { backgroundColor: colors.primary }]}
                      onPress={() => setConnectTool(tool)}
                      activeOpacity={0.85}
                    >
                      <Feather name="link" size={12} color="#fff" />
                      <Text style={styles.connectBtnText}>Connect</Text>
                    </TouchableOpacity>
                  )}
                  {tool.affiliateLink && !isConnected && (
                    <TouchableOpacity
                      style={[styles.affiliateBtn, { backgroundColor: colors.secondary + "20", borderColor: colors.secondary + "30" }]}
                      onPress={() => openLink(tool.affiliateLink)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.affiliateBtnText, { color: colors.secondary }]}>Get Tool</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search || selectedCat ? "No tools found" : "No tools yet"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search || selectedCat ? "Try adjusting your filters" : "Check back soon"}
              </Text>
            </View>
          }
        />
      )}

      {/* Connect sheet */}
      <ConnectSheet
        tool={connectTool}
        onClose={() => setConnectTool(null)}
        onConnected={() => { void refetchCreds(); }}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 13, marginTop: -4 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 15, height: "100%" },
  chips: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "500" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  toolHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  toolTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  toolName: { fontSize: 15, fontWeight: "700", flex: 1 },
  toolDesc: { fontSize: 12, lineHeight: 17 },
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  connectedText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  toolFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1, flexWrap: "wrap" },
  pricingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  pricingText: { fontSize: 11, fontWeight: "600" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  linkBtnText: { fontSize: 12, fontWeight: "500" },
  connectBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  connectBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  connectedBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  connectedBtnText: { fontSize: 12, fontWeight: "600" },
  affiliateBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  affiliateBtnText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
