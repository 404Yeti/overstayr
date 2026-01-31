import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import {
  getReminderSettings,
  setReminderEnabled,
  setReminderTime,
  ReminderSettings,
} from "../services/settings";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);

  // Keep as strings so typing feels normal
  const [hourStr, setHourStr] = useState("09");
  const [minuteStr, setMinuteStr] = useState("00");

  async function load() {
    setLoading(true);
    try {
      const s = await getReminderSettings();
      setSettings(s);
      setHourStr(pad2(s.hour));
      setMinuteStr(pad2(s.minute));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function ensurePermission(): Promise<boolean> {
    if (Platform.OS === "web") return false;

    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  }

  async function onToggleEnabled(next: boolean) {
    // Optimistic UI update
    setSettings((prev) => (prev ? { ...prev, enabled: next } : prev));

    await setReminderEnabled(next);

    // If turning ON, ask permission immediately on device
    if (next && Platform.OS !== "web") {
      const ok = await ensurePermission();
      if (!ok) {
        Alert.alert(
          "Notifications not enabled",
          "Permission was not granted. You can enable notifications in your phone settings."
        );
      }
    }
  }

  async function onSaveTime() {
    const h = Number(hourStr);
    const m = Number(minuteStr);

    if (!Number.isFinite(h) || h < 0 || h > 23) {
      Alert.alert("Invalid hour", "Use 0–23 (example: 9, 14, 23).");
      return;
    }
    if (!Number.isFinite(m) || m < 0 || m > 59) {
      Alert.alert("Invalid minute", "Use 0–59 (example: 0, 15, 30).");
      return;
    }

    await setReminderTime(h, m);
    setSettings((prev) => (prev ? { ...prev, hour: h, minute: m } : prev));
    Alert.alert("Saved", `Default reminder time set to ${pad2(h)}:${pad2(m)}.`);
  }

  const enabled = settings?.enabled ?? true;
  const timeLabel = settings
    ? `${pad2(settings.hour)}:${pad2(settings.minute)}`
    : "--:--";

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0B2E4A", "#0F3A5F"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionDescription}>
          Manage reminders and app behavior. Your data is stored locally on this
          device.
        </Text>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#0F3A5F" />
          </View>
        )}

        {/* Reminders enabled */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardTextContainer}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="notifications-outline" size={20} color="#0F3A5F" />
                <Text style={styles.cardTitle}>Reminders</Text>
              </View>
              <Text style={styles.cardDescription}>
                Turn local reminders on/off for visa expiry.
              </Text>
            </View>

            <Switch
              value={enabled}
              onValueChange={onToggleEnabled}
              disabled={loading}
              trackColor={{ false: "#E0E0E0", true: "#0F3A5F" }}
              thumbColor={enabled ? "#FFFFFF" : "#F4F4F4"}
            />
          </View>

          {Platform.OS === "web" && (
            <Text style={styles.webWarning}>
              Notifications are not supported on web. Test on a real device.
            </Text>
          )}
        </View>

        {/* Default time */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={20} color="#0F3A5F" />
            <Text style={styles.cardTitle}>Default reminder time</Text>
          </View>

          <Text style={styles.currentTime}>
            Current: <Text style={styles.currentTimeValue}>{timeLabel}</Text>
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hour (0–23)</Text>
              <TextInput
                value={hourStr}
                onChangeText={setHourStr}
                keyboardType="number-pad"
                placeholder="09"
                placeholderTextColor="#999"
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minute (0–59)</Text>
              <TextInput
                value={minuteStr}
                onChangeText={setMinuteStr}
                keyboardType="number-pad"
                placeholder="00"
                placeholderTextColor="#999"
                editable={!loading}
                style={styles.input}
              />
            </View>
          </View>

          <Pressable
            onPress={onSaveTime}
            disabled={loading}
            style={({ pressed }) => [
              styles.saveButton,
              loading && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>Save reminder time</Text>
          </Pressable>

          {Platform.OS !== "web" && (
            <Pressable
              onPress={async () => {
                const ok = await ensurePermission();
                Alert.alert(
                  ok ? "Enabled" : "Not enabled",
                  ok
                    ? "Notifications permission is granted."
                    : "Permission is not granted. Enable it in your phone settings."
                );
              }}
              style={styles.checkPermissionButton}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
              <Text style={styles.checkPermissionText}>
                Check notification permission
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={14} color="#999" />
          <Text style={styles.footerText}>
            No account required. No data leaves your device.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionDescription: {
    color: "#666",
    lineHeight: 22,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 12,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#0B2E4A",
  },
  cardDescription: {
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
  },
  webWarning: {
    color: "#888",
    fontSize: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  currentTime: {
    color: "#666",
    marginBottom: 14,
  },
  currentTimeValue: {
    fontWeight: "800",
    color: "#0B2E4A",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    gap: 8,
  },
  inputLabel: {
    fontWeight: "600",
    color: "#444",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#F4F6F8",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#0B2E4A",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#0F3A5F",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  checkPermissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    marginTop: 8,
  },
  checkPermissionText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  footerText: {
    color: "#999",
    fontSize: 12,
  },
});
