import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { SystemCard, type SystemItem } from "@/components/SystemCard";

interface SystemInstance {
  id: number;
  name: string;
  buildStatus: string;
  healthStatus: string;
  blueprintId: number;
  userId: number;
  createdAt: string;
}

const STATUS_FILTERS = ["all", "active", "building", "paused", "failed"] as const;
type FilterStatus = (typeof STATUS_FILTERS)[number];

export default function SystemsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  const { data, isLoading, refetch } = useQuery<SystemInstance[]>({
    queryKey: ["system-instances"],
    queryFn: () => apiFetch<SystemInstance[]>("/system-instances"),
    staleTime: 15_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || s.buildStatus === filter;
      return matchSearch && matchFilter;
    });
  }, [data, search, filter]);

  const systemItems: SystemItem[] = filtered.map((s) => ({
    id: s.id,
    name: s.name,
    buildStatus: s.buildStatus,
    healthStatus: s.healthStatus,
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Systems</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {data?.length ?? 0} automated systems
        </Text>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search systems…"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <FlatList
          data={STATUS_FILTERS as unknown as FilterStatus[]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === item ? colors.primary : colors.muted,
                  borderColor: filter === item ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === item ? "#fff" : colors.mutedForeground },
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={systemItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SystemCard
              system={item}
              onPress={() => router.push(`/(tabs)/systems/${item.id}`)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomPad + 24 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          scrollEnabled={!!systemItems.length}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="cpu" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "No systems found" : "No systems yet"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search
                  ? "Try a different search"
                  : "Build your first system using the Build tab"}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/(tabs)/build")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyBtnText}>Start Building</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sub: { fontSize: 13, marginTop: -4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  filters: {
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
