import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
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

const CATEGORY_ICONS: Record<string, string> = {
  "ai": "cpu",
  "automation": "zap",
  "content": "file-text",
  "analytics": "bar-chart-2",
  "email": "mail",
  "payment": "credit-card",
  "crm": "users",
  "ecommerce": "shopping-bag",
};

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

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

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(t => {
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
          {data?.length ?? 0} curated tools for your empire
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
          {categories?.map(cat => (
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
          keyExtractor={item => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item: tool }) => (
            <GlassCard>
              <View style={styles.toolHeader}>
                <View style={[styles.toolIcon, { backgroundColor: colors.secondary + "20", borderColor: colors.secondary + "30" }]}>
                  <Feather name={(CATEGORY_ICONS[tool.name?.toLowerCase().split(" ")[0] ?? ""] ?? "tool") as any} size={16} color={colors.secondary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.toolTitleRow}>
                    <Text style={[styles.toolName, { color: colors.foreground }]}>{tool.name}</Text>
                    {tool.activeStatus && (
                      <View style={[styles.activeBadge, { backgroundColor: colors.success + "20", borderColor: colors.success + "40" }]}>
                        <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                        <Text style={[styles.activeText, { color: colors.success }]}>Active</Text>
                      </View>
                    )}
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
                {tool.affiliateLink && (
                  <TouchableOpacity
                    style={[styles.affiliateBtn, { backgroundColor: colors.primary }]}
                    onPress={() => openLink(tool.affiliateLink)}
                    activeOpacity={0.85}
                  >
                    <Feather name="arrow-right" size={12} color="#fff" />
                    <Text style={styles.affiliateBtnText}>Get Tool</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          )}
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
  toolTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolName: { fontSize: 15, fontWeight: "700", flex: 1 },
  toolDesc: { fontSize: 12, lineHeight: 17 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  toolFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1 },
  pricingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  pricingText: { fontSize: 11, fontWeight: "600" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  linkBtnText: { fontSize: 12, fontWeight: "500" },
  affiliateBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  affiliateBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
