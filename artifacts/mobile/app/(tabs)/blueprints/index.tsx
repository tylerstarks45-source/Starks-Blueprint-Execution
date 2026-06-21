import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

interface BlueprintCategory {
  id: number;
  name: string;
  slug: string;
}

interface Blueprint {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  difficulty: string | null;
  estimatedTime: string | null;
  estimatedEarnings: string | null;
  estimatedCost: string | null;
  categoryId: number | null;
  status: string;
  priceCredits: number | null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#00D97E",
  intermediate: "#F5A623",
  advanced: "#EF2152",
};

export default function BlueprintsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const { data: categories } = useQuery<BlueprintCategory[]>({
    queryKey: ["blueprint-categories"],
    queryFn: () => apiFetch<BlueprintCategory[]>("/blueprint-categories"),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading, refetch } = useQuery<Blueprint[]>({
    queryKey: ["blueprints"],
    queryFn: () => apiFetch<Blueprint[]>("/blueprints"),
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(bp => {
      const matchSearch = !search || bp.name.toLowerCase().includes(search.toLowerCase())
        || (bp.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCat || bp.categoryId === selectedCat;
      return matchSearch && matchCat;
    });
  }, [data, search, selectedCat]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Blueprints</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {data?.length ?? 0} ready-to-launch systems
        </Text>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search blueprints…"
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
          renderItem={({ item: bp }) => {
            const diffColor = DIFFICULTY_COLORS[bp.difficulty ?? ""] ?? colors.primary;
            return (
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(tabs)/blueprints/${bp.id}`)}>
                <GlassCard>
                  <View style={styles.bpHeader}>
                    <View style={[styles.bpIcon, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
                      <Feather name="cpu" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.bpName, { color: colors.foreground }]}>{bp.name}</Text>
                      {bp.description && (
                        <Text style={[styles.bpDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {bp.description}
                        </Text>
                      )}
                    </View>
                    {bp.difficulty && (
                      <View style={[styles.diffBadge, { backgroundColor: diffColor + "20", borderColor: diffColor + "40" }]}>
                        <Text style={[styles.diffText, { color: diffColor }]}>
                          {bp.difficulty.charAt(0).toUpperCase() + bp.difficulty.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.bpMeta, { borderTopColor: colors.border }]}>
                    {bp.estimatedTime && (
                      <View style={styles.metaItem}>
                        <Feather name="clock" size={11} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{bp.estimatedTime}</Text>
                      </View>
                    )}
                    {bp.estimatedEarnings && (
                      <View style={styles.metaItem}>
                        <Feather name="trending-up" size={11} color={colors.success} />
                        <Text style={[styles.metaText, { color: colors.success }]}>{bp.estimatedEarnings}</Text>
                      </View>
                    )}
                    {(bp.priceCredits ?? 0) > 0 && (
                      <View style={styles.metaItem}>
                        <Feather name="zap" size={11} color={colors.accent} />
                        <Text style={[styles.metaText, { color: colors.accent }]}>{bp.priceCredits} cr</Text>
                      </View>
                    )}
                    {(bp.priceCredits ?? 0) === 0 && (
                      <View style={styles.metaItem}>
                        <Feather name="gift" size={11} color={colors.success} />
                        <Text style={[styles.metaText, { color: colors.success }]}>Free</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="package" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search || selectedCat ? "No blueprints found" : "No blueprints yet"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search || selectedCat ? "Try adjusting your filters" : "Check back soon for new blueprints"}
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
  bpHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  bpIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  bpName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  bpDesc: { fontSize: 12, lineHeight: 17 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start", flexShrink: 0 },
  diffText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  bpMeta: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontWeight: "500" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
});
