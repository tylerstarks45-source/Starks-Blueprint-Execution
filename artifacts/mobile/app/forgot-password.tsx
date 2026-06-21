import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) { setError("Enter your email address."); return; }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/request-reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 40);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.brand}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondary + "20", borderColor: colors.secondary + "40" }]}>
            <Feather name="key" size={28} color={colors.secondary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Forgot Password?</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Enter your email and we'll send a reset link
          </Text>
        </View>

        {sent ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.success + "40" }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={32} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Check your inbox</Text>
            <Text style={[styles.successText, { color: colors.mutedForeground }]}>
              If an account exists for {email}, you'll receive a reset link shortly.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.btnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {error && (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email Address</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Feather name="mail" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 24 },
  back: { alignSelf: "flex-start", padding: 4 },
  brand: { alignItems: "center", gap: 10, paddingVertical: 4 },
  iconBox: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { fontSize: 13, flex: 1 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, gap: 10 },
  input: { flex: 1, fontSize: 15, height: "100%" },
  btn: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  successIcon: { alignSelf: "center", width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  successText: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
