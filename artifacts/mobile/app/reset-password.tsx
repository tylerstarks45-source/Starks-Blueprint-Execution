import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!token) { setError("Invalid reset link. Please request a new one."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed. Please request a new link.");
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
        <View style={styles.brand}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>New Password</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            Choose a strong password for your account
          </Text>
        </View>

        {done ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.success + "40" }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
              <Feather name="check-circle" size={32} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Password Updated!</Text>
            <Text style={[styles.successText, { color: colors.mutedForeground }]}>
              Your password has been changed. You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.btnText}>Sign In</Text>
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
              <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPass}
                  returnKeyType="next"
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={8}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm Password</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Update Password</Text>}
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
  brand: { alignItems: "center", gap: 10, paddingVertical: 8 },
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
