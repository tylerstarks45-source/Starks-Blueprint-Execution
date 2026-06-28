import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";

interface BlueprintStep {
  id: number;
  title: string;
  description: string | null;
  stepNumber: number;
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
  requiredTools: string[] | null;
  priceCredits: number | null;
  status: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#00D97E",
  intermediate: "#F5A623",
  advanced: "#EF2152",
};

export default function BlueprintDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;

  const { data: bp, isLoading } = useQuery<Blueprint>({
    queryKey: ["blueprint", id],
    queryFn: () => apiFetch<Blueprint>(`/blueprints/${id}`),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const { data: steps } = useQuery<BlueprintStep[]>({
    queryKey: ["blueprint-steps", id],
    queryFn: () => apiFetch<BlueprintStep[]>(`/blueprints/${id}/steps`),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  function handleStartWithASH() {
    if (!bp) return;
    router.push({ pathname: "/(tabs)/build", params: { blueprintId: String(id), blueprintName: bp.name } });
  }

  const diffColor = DIFFICULTY_COLORS[bp?.difficulty ?? ""] ?? colors.primary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.navBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>Blueprint</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : !bp ? (
        <View style={styles.loader}>
          <Text style={[{ color: colors.mutedForeground }]}>Blueprint not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad + 100, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title card */}
          <GlassCard>
            <View style={styles.bpHeader}>
              <View style={[styles.bpIcon, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "30" }]}>
                <Feather name="cpu" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.bpName, { color: colors.foreground }]}>{bp.name}</Text>
                {bp.difficulty && (
                  <View style={[styles.diffBadge, { backgroundColor: diffColor + "20", borderColor: diffColor + "40" }]}>
                    <Text style={[styles.diffText, { color: diffColor }]}>
                      {bp.difficulty.charAt(0).toUpperCase() + bp.difficulty.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {bp.description && (
              <Text style={[styles.desc, { color: colors.mutedForeground }]}>{bp.description}</Text>
            )}

            {/* Stats row */}
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              {bp.estimatedTime && (
                <View style={styles.stat}>
                  <Feather name="clock" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{bp.estimatedTime}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Setup time</Text>
                </View>
              )}
              {bp.estimatedEarnings && (
                <View style={styles.stat}>
                  <Feather name="trending-up" size={13} color={colors.success} />
                  <Text style={[styles.statValue, { color: colors.success }]}>{bp.estimatedEarnings}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Est. earnings</Text>
                </View>
              )}
              {bp.estimatedCost && (
                <View style={styles.stat}>
                  <Feather name="dollar-sign" size={13} color={colors.accent} />
                  <Text style={[styles.statValue, { color: colors.accent }]}>{bp.estimatedCost}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Est. cost</Text>
                </View>
              )}
            </View>
          </GlassCard>

          {/* Required tools */}
          {bp.requiredTools && bp.requiredTools.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Required Tools</Text>
              <GlassCard>
                <View style={styles.toolsList}>
                  {bp.requiredTools.map((tool, i) => (
                    <View key={i} style={[styles.toolChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Feather name="tool" size={10} color={colors.primary} />
                      <Text style={[styles.toolText, { color: colors.foreground }]}>{tool}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            </View>
          )}

          {/* Steps */}
          {steps && steps.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
              <GlassCard padding={0} style={{ overflow: "hidden" }}>
                {steps.map((step, i) => (
                  <View key={step.id}>
                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
                        <Text style={[styles.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
                        {step.description && (
                          <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{step.description}</Text>
                        )}
                      </View>
                    </View>
                    {i < steps.length - 1 && <View style={[styles.stepDivider, { backgroundColor: colors.border }]} />}
                  </View>
                ))}
              </GlassCard>
            </View>
          )}
        </ScrollView>
      )}

      {/* CTA */}
      {bp && (
        <View style={[styles.ctaBar, { paddingBottom: bottomPad + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartWithASH}
            activeOpacity={0.85}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Start with ASH</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 16, fontWeight: "600" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  bpHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 12 },
  bpIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  bpName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  diffBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  diffText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  desc: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  statsRow: { flexDirection: "row", gap: 20, paddingTop: 14, borderTopWidth: 1, marginTop: 8 },
  stat: { gap: 4, alignItems: "flex-start" },
  statValue: { fontSize: 15, fontWeight: "700" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, marginLeft: 2 },
  toolsList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toolChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  toolText: { fontSize: 12, fontWeight: "500" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  stepNumText: { fontSize: 12, fontWeight: "700" },
  stepTitle: { fontSize: 14, fontWeight: "600" },
  stepDesc: { fontSize: 12, lineHeight: 17 },
  stepDivider: { height: 1, marginHorizontal: 14 },
  ctaBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: 16, gap: 8 },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
