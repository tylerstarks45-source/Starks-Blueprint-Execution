import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function SystemsStackLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Systems", headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "System Detail", headerBackTitle: "Systems" }} />
    </Stack>
  );
}
