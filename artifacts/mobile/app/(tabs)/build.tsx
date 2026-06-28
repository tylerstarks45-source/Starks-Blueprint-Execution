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

// ─── TTS helper ───────────────────────────────────────────────────────────────

async function playTTSResponse(text: string): Promise<void> {
  if (!text || Platform.OS === "web") return;
  const clean = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~]/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .trim()
    .slice(0, 800);
  if (!clean) return;
  try {
    const { apiFetch: af } = await import("@/lib/api");
    const data = await af<{ audioBase64?: string; mimeType?: string; status?: string }>("/media-gen/tts", {
      method: "POST",
      body: JSON.stringify({ text: clean, voice: "warm narrator" }),
    });
    if (!data.audioBase64) return;
    const { Audio } = await import("expo-av");
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:${data.mimeType ?? "audio/mpeg"};base64,${data.audioBase64}` },
      { shouldPlay: true },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    // TTS is optional — silently ignore errors
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ASHMode = "chat" | "plan" | "build";

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
  action?: string;
  plan?: BuildPlan;
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<ASHMode, { label: string; color: string; placeholder: string; welcome: string }> = {
  chat: {
    label: "CHAT",
    color: "#1A8CFF",
    placeholder: "Ask ASH anything…",
    welcome: "Hey! I'm ASH — your AI assistant. Ask me anything: business advice, how things work, what's trending, or anything on your mind. Switch to PLAN mode when you're ready to design a build, or BUILD when it's time to execute.",
  },
  plan: {
    label: "PLAN",
    color: "#8844E0",
    placeholder: "Describe what you want to build…",
    welcome: "Planning mode is active. Tell me about your business idea or income goal and I'll help you think it through — tools, strategy, timelines, and revenue potential. When you're ready to create a formal build plan, just say so.",
  },
  build: {
    label: "BUILD",
    color: "#00D97E",
    placeholder: "Tell ASH what to build…",
    welcome: "Build mode is active. Tell me what system you want me to build and I'll create a full plan, gather your credentials, and execute it step by step.",
  },
};

// ─── Build Plan Card ──────────────────────────────────────────────────────────

function BuildPlanCard({ plan, colors }: { plan: BuildPlan; colors: ReturnType<typeof useColors> }) {
  const progress = plan.progress ?? 0;
  const phaseIdx = plan.phase_index ?? 1;
  const totalPhases = plan.total_phases ?? 3;

  const PHASE_COLORS = ["#8844E0", "#1A8CFF", "#00D97E"];
  const phaseColor = PHASE_COLORS[Math.min(phaseIdx - 1, 2)] ?? colors.primary;

  return (
    <View style={[bpStyles.card, { backgroundColor: colors.card, borderColor: phaseColor + "50" }]}>
      <View style={bpStyles.phaseRow}>
        <View style={[bpStyles.phaseBadge, { backgroundColor: phaseColor + "20", borderColor: phaseColor + "40" }]}>
          <Text style={[bpStyles.phaseNum, { color: phaseColor }]}>Phase {phaseIdx}/{totalPhases}</Text>
        </View>
        <Text style={[bpStyles.phaseTitle, { color: colors.foreground }]} numberOfLines={1}>
          {plan.phase}
        </Text>
      </View>

      {progress > 0 && (
        <View style={[bpStyles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[bpStyles.progressFill, { width: `${progress}%` as any, backgroundColor: phaseColor }]} />
        </View>
      )}

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

function extractBuildPlan(content: string, action?: string): BuildPlan | null {
  if (!action || !["present_plan", "start_build", "build_step"].includes(action)) return null;
  const match = content.match(/```json\s*([\s\S]*?)```/);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.phase || parsed.steps) return parsed as BuildPlan;
    } catch {}
  }
  return { phase: action === "present_plan" ? "Planning Phase" : "Build Phase", progress: 0 };
}

// ─── Mode Pill ────────────────────────────────────────────────────────────────

function ModePill({
  mode,
  ashMode,
  onPress,
}: {
  mode: ASHMode;
  ashMode: ASHMode;
  onPress: () => void;
}) {
  const cfg = MODE_CONFIG[mode];
  const active = ashMode === mode;
  return (
    <TouchableOpacity
      style={[
        styles.modePill,
        {
          backgroundColor: active ? cfg.color + "20" : "transparent",
          borderColor: active ? cfg.color : "transparent",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.modePillText, { color: active ? cfg.color : "#6B7A99" }]}>
        {cfg.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

function makeWelcome(mode: ASHMode): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: MODE_CONFIG[mode].welcome,
  };
}

export default function BuildScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const params = useLocalSearchParams<{ blueprintId?: string; blueprintName?: string }>();

  const [ashMode, setAshMode] = useState<ASHMode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome("chat")]);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (params.blueprintId && params.blueprintName) {
      setAshMode("build");
      setInput(`I'd like to build the "${params.blueprintName}" blueprint. Let's go!`);
    }
  }, [params.blueprintId, params.blueprintName]);

  function switchMode(m: ASHMode) {
    if (m === ashMode) return;
    Haptics.selectionAsync();
    setAshMode(m);
    setMessages([makeWelcome(m)]);
    setHistory([]);
    setInput("");
  }

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
      const data = await apiFetch<ChatResponse>("/ai-orchestrator/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: currentHistory,
          chatOnly: ashMode === "chat",
          planMode: ashMode === "plan",
        }),
      });

      const action = data.action ?? data.action_type;
      // Prefer structured plan from response; fall back to markdown-extracted plan
      const buildPlan = data.plan ?? extractBuildPlan(data.content, action);

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

      // TTS auto-playback if voice responses are enabled
      if (voiceResponseEnabled && data.content) {
        void playTTSResponse(data.content);
      }

      if (action === "collect_credentials" || action === "start_build") {
        setAshMode("build");
      }
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
  }, [input, sending, history, ashMode, voiceResponseEnabled]);

  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : Platform.OS === "android" ? 56 : 49;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT;
  const modeColor = MODE_CONFIG[ashMode].color;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.ashIcon, { backgroundColor: modeColor + "20", borderColor: modeColor + "40" }]}>
            <Feather name="zap" size={18} color={modeColor} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>ASH</Text>
            <Text style={[styles.headerSub, { color: colors.success }]}>● Online</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Voice toggle */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setVoiceResponseEnabled((v) => !v);
            }}
            style={{
              width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center",
              backgroundColor: voiceResponseEnabled ? "#8844E020" : "transparent",
              borderColor: voiceResponseEnabled ? "#8844E060" : colors.border,
            }}
            activeOpacity={0.7}
          >
            <Feather name={voiceResponseEnabled ? "volume-2" : "volume-x"} size={15} color={voiceResponseEnabled ? "#8844E0" : colors.mutedForeground} />
          </TouchableOpacity>

          {/* Mode switcher */}
          <View style={[styles.modeRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {(["chat", "plan", "build"] as ASHMode[]).map((m) => (
              <ModePill key={m} mode={m} ashMode={ashMode} onPress={() => switchMode(m)} />
            ))}
          </View>
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
        <VoiceButton
          colors={colors}
          onTranscript={(t) => {
            setInput(t);
            // Auto-send after 1 s so user can review; send() takes overrideText
            // so it reads the fresh value, not stale state.
            setTimeout(() => { send(t); }, 1000);
          }}
          disabled={sending}
        />
        <TextInput
          style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: ashMode === "chat" ? colors.border : modeColor + "50" }]}
          value={input}
          onChangeText={setInput}
          placeholder={MODE_CONFIG[ashMode].placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => send()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? modeColor : colors.muted, borderColor: input.trim() ? modeColor : colors.border }]}
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  ashIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  headerSub: { fontSize: 11, fontWeight: "500" },
  modeRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, padding: 3, gap: 2 },
  modePill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, borderWidth: 1 },
  modePillText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
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
