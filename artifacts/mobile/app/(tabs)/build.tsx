import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuildStep {
  title: string;
  description?: string;
  status?: "pending" | "running" | "done" | "error";
}

interface BuildPlan {
  phase: string;
  phase_index?: number;
  total_phases?: number;
  steps?: BuildStep[];
  progress?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  buildPlan?: BuildPlan | null;
}

interface ChatResponse {
  content: string;
  action_type?: string;
  plan?: BuildPlan;
}

// ─── Build Plan Card ──────────────────────────────────────────────────────────

function BuildPlanCard({ plan, colors }: { plan: BuildPlan; colors: ReturnType<typeof useColors> }) {
  const progress = plan.progress ?? 0;
  const phaseIdx = plan.phase_index ?? 1;
  const totalPhases = plan.total_phases ?? 3;

  const PHASE_COLORS = ["#8844E0", "#1A8CFF", "#00D97E"];
  const phaseColor = PHASE_COLORS[Math.min(phaseIdx - 1, 2)] ?? colors.primary;

  return (
    <View style={[bpStyles.card, { backgroundColor: colors.card, borderColor: phaseColor + "50" }]}>
      {/* Phase header */}
      <View style={bpStyles.phaseRow}>
        <View style={[bpStyles.phaseBadge, { backgroundColor: phaseColor + "20", borderColor: phaseColor + "40" }]}>
          <Text style={[bpStyles.phaseNum, { color: phaseColor }]}>Phase {phaseIdx}/{totalPhases}</Text>
        </View>
        <Text style={[bpStyles.phaseTitle, { color: colors.foreground }]} numberOfLines={1}>
          {plan.phase}
        </Text>
      </View>

      {/* Progress bar */}
      {progress > 0 && (
        <View style={[bpStyles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[bpStyles.progressFill, { width: `${progress}%` as any, backgroundColor: phaseColor }]} />
        </View>
      )}

      {/* Steps */}
      {plan.steps && plan.steps.length > 0 && (
        <View style={bpStyles.steps}>
          {plan.steps.map((step, i) => {
            const s = step.status ?? "pending";
            const stepColor = s === "done" ? colors.success : s === "running" ? colors.primary : s === "error" ? colors.destructive : colors.mutedForeground;
            const stepIcon = s === "done" ? "check-circle" : s === "running" ? "loader" : s === "error" ? "x-circle" : "circle";
            return (
              <View key={i} style={bpStyles.stepRow}>
                <Feather name={stepIcon as any} size={13} color={stepColor} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[bpStyles.stepTitle, { color: s === "pending" ? colors.mutedForeground : colors.foreground }]}>
                    {step.title}
                  </Text>
                  {step.description && s !== "pending" && (
                    <Text style={[bpStyles.stepDesc, { color: colors.mutedForeground }]}>{step.description}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const bpStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8, gap: 10 },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  phaseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  phaseNum: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  phaseTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  steps: { gap: 8 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  stepTitle: { fontSize: 13, fontWeight: "500" },
  stepDesc: { fontSize: 11, lineHeight: 16 },
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, colors }: { msg: ChatMessage; colors: ReturnType<typeof useColors> }) {
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
          <Feather name="zap" size={14} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: isUser ? undefined : 1, maxWidth: isUser ? "80%" : undefined }}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.primary : colors.card,
              borderColor: isUser ? colors.primary : colors.border,
            },
          ]}
        >
          {msg.loading ? (
            <View style={styles.loadingDots}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Thinking…</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.foreground }]}>
              {msg.content}
            </Text>
          )}
        </View>
        {msg.buildPlan && <BuildPlanCard plan={msg.buildPlan} colors={colors} />}
      </View>
    </View>
  );
}

// ─── Voice Button ─────────────────────────────────────────────────────────────

function VoiceButton({
  colors,
  onTranscript,
  disabled,
}: {
  colors: ReturnType<typeof useColors>;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const recordingRef = useRef<unknown>(null);

  async function startRecording() {
    try {
      const { Audio } = await import("expo-av");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setRecording(false);
    }
  }

  async function stopRecording() {
    setRecording(false);
    if (!recordingRef.current) return;
    setLoading(true);
    try {
      const rec = recordingRef.current as { stopAndUnloadAsync: () => Promise<void>; getURI: () => string | null };
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      if (!uri) { setLoading(false); return; }

      const form = new FormData();
      form.append("audio", { uri, type: "audio/m4a", name: "voice.m4a" } as unknown as Blob);

      const result = await apiFetch<{ text: string }>("/ai-orchestrator/transcribe", {
        method: "POST",
        body: form,
        headers: {},
      });
      if (result.text) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onTranscript(result.text);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  if (Platform.OS === "web") return null;

  return (
    <Pressable
      onPressIn={startRecording}
      onPressOut={stopRecording}
      disabled={disabled || loading}
      style={[
        styles.voiceBtn,
        {
          backgroundColor: recording ? "#EF2152" + "20" : colors.muted,
          borderColor: recording ? "#EF2152" : colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Feather name="mic" size={18} color={recording ? "#EF2152" : colors.mutedForeground} />
      )}
    </Pressable>
  );
}

// ─── Parse plan from content ──────────────────────────────────────────────────

function extractBuildPlan(content: string, actionType?: string): BuildPlan | null {
  if (!actionType || !["present_plan", "start_build", "build_step"].includes(actionType)) {
    return null;
  }
  const match = content.match(/```json\s*([\s\S]*?)```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.phase || parsed.steps) return parsed as BuildPlan;
    } catch {}
  }
  return { phase: actionType === "present_plan" ? "Planning Phase" : "Build Phase", progress: 0 };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm ASH — your AI for everything. Chat with me, ask me to build something, generate content, or automate your entire business. I can do it all. What do you need?",
};

export default function BuildScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const params = useLocalSearchParams<{ blueprintId?: string; blueprintName?: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (params.blueprintId && params.blueprintName) {
      setInput(`I'd like to build the "${params.blueprintName}" blueprint. Can you help me get started?`);
    }
  }, [params.blueprintId, params.blueprintName]);

  const genId = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
    const loadingId = genId();
    const loadingMsg: ChatMessage = { id: loadingId, role: "assistant", content: "", loading: true };
    const currentHistory = history;

    setMessages((prev) => [loadingMsg, userMsg, ...prev]);

    try {
      const data = await apiFetch<ChatResponse>("/dashboard/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history: currentHistory }),
      });

      const buildPlan = extractBuildPlan(data.content, data.action_type ?? undefined);

      const assistantMsg: ChatMessage = {
        id: loadingId,
        role: "assistant",
        content: data.content,
        buildPlan,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadingId ? assistantMsg : m)));
      setHistory((h) => [
        { role: "assistant", content: data.content },
        { role: "user", content: text },
        ...h.slice(0, 18),
      ]);
    } catch (e: unknown) {
      const errMsg: ChatMessage = {
        id: loadingId,
        role: "assistant",
        content: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? errMsg : m)));
    } finally {
      setSending(false);
    }
  }, [input, sending, history]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.ashIcon, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
          <Feather name="zap" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>ASH</Text>
          <Text style={[styles.headerSub, { color: colors.success }]}>● Online</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble msg={item} colors={colors} />}
        inverted
        contentContainerStyle={styles.listContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 10 }]}>
        <VoiceButton colors={colors} onTranscript={(t) => { setInput(t); }} disabled={sending} />
        <TextInput
          style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask ASH anything…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => send()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted, borderColor: input.trim() ? colors.primary : colors.border }]}
          onPress={() => send()}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isIOS ? (
            <SymbolView name="arrow.up" size={18} tintColor="#fff" />
          ) : (
            <Feather name="arrow-up" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  ashIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  headerSub: { fontSize: 11, fontWeight: "500" },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  bubbleWrap: { flexDirection: "row", gap: 8, marginBottom: 2 },
  bubbleUser: { justifyContent: "flex-end", flexDirection: "row-reverse" },
  bubbleAssistant: { justifyContent: "flex-start" },
  avatar: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0, marginTop: 4 },
  bubble: { borderWidth: 1, borderRadius: 16, padding: 12 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  loadingDots: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  loadingText: { fontSize: 13 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  voiceBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, flexShrink: 0 },
});
