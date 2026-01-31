import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="index" options={{ title: "Overstayr" }} />
        <Stack.Screen name="add" options={{ title: "Add Visa" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
