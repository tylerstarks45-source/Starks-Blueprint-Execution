import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
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
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
}

interface RecommendedTool {
  id: number;
  name: string;
  description: string | null;
  affiliateLink: string | null;
  category: string;
}

interface ChatResponse {
  content: string;
  recommendedTools?: RecommendedTool[];
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey! I'm ASH — your AI systems architect. Tell me about your goals and I'll help you pick the right blueprint and tools to build your automated income system. What are you trying to achieve?",
};

function MessageBubble({ msg, colors }: { msg: ChatMessage; colors: ReturnType<typeof useColors> }) {
  const isUser = msg.role === "user";
  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
          <Feather name="zap" size={14} color={colors.primary} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : colors.card,
            borderColor: isUser ? colors.primary : colors.border,
            maxWidth: "80%",
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
    </View>
  );
}

export default function BuildScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const genId = () => `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
    const loadingMsg: ChatMessage = { id: genId(), role: "assistant", content: "", loading: true };

    // Capture history before state update
    const currentHistory = history;

    setMessages((prev) => [loadingMsg, userMsg, ...prev]);

    try {
      const data = await apiFetch<ChatResponse>("/dashboard/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, history: currentHistory }),
      });

      const assistantMsg: ChatMessage = {
        id: loadingMsg.id,
        role: "assistant",
        content: data.content,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? assistantMsg : m))
      );
      setHistory((h) => [
        { role: "assistant", content: data.content },
        { role: "user", content: text },
        ...h.slice(0, 18),
      ]);
    } catch (e: unknown) {
      const errMsg: ChatMessage = {
        id: loadingMsg.id,
        role: "assistant",
        content: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? errMsg : m))
      );
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
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={[styles.ashIcon, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
          <Feather name="zap" size={18} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>ASH</Text>
          <Text style={[styles.headerSub, { color: colors.success }]}>● Online</Text>
        </View>
      </View>

      {/* Messages — inverted FlatList */}
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
        scrollEnabled={!!messages.length}
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 10,
          },
        ]}
      >
        <TextInput
          style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask ASH anything…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: input.trim() ? colors.primary : colors.muted,
              borderColor: input.trim() ? colors.primary : colors.border,
            },
          ]}
          onPress={send}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  ashIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bubbleWrap: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  bubbleUser: {
    justifyContent: "flex-end",
    flexDirection: "row-reverse",
  },
  bubbleAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
    marginTop: 4,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  loadingText: {
    fontSize: 13,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexShrink: 0,
  },
});
