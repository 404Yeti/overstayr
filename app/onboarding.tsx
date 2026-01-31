import { useState } from "react";
import { View, Text, Pressable, Platform, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { setOnboardingDone } from "../services/settings";
import { LinearGradient } from "expo-linear-gradient";

export default function Onboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish() {
    await setOnboardingDone();
    router.replace("/");
  }

  async function enableNotifications() {
    try {
      setBusy(true);
      if (Platform.OS !== "web") {
        await Notifications.requestPermissionsAsync();
      }
      await finish();
    } finally {
      setBusy(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0B2E4A", "#0F3A5F"]}
      style={styles.container}
    >
      {/* Decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <View style={styles.content}>
        {/* Logo */}
        <Image
          source={require("../assets/images/overstayr-logo.png")}
          style={styles.logo}
        />

        <Text style={styles.title}>Overstayr</Text>
        <Text style={styles.subtitle}>Never overstay your visa again</Text>

        <Text style={styles.description}>
          Track visa time limits with a live countdown. Get smart reminders
          before expiry so you can travel worry-free.
        </Text>

        <View style={styles.buttonContainer}>
          <Pressable
            disabled={busy}
            onPress={enableNotifications}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Enabling..." : "Enable Reminders"}
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={finish}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          You can enable notifications anytime in Settings
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -50,
    right: -100,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(244, 246, 248, 0.06)",
    bottom: 100,
    left: -80,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 48,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: "#0B2E4A",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 15,
    fontWeight: "600",
  },
  footnote: {
    position: "absolute",
    bottom: 48,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.3)",
    textAlign: "center",
  },
});
