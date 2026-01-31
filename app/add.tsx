import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { saveVisa, Visa } from "../services/storage";
import { ensureNotifPermission, scheduleVisaReminder } from "../services/notifications";
import { getReminderSettings } from "../services/settings";

function addDaysUTC(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function atLocalTime(dateUTC: Date, hour = 9, minute = 0) {
  // Convert the UTC date to a LOCAL date at a specific time (e.g., 09:00)
  const local = new Date(dateUTC);
  local.setHours(hour, minute, 0, 0);
  return local;
}

function isValidDateYYYYMMDD(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export default function AddVisa() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState("VN");
  const [visaLabel, setVisaLabel] = useState("Tourist");
  const [entryDate, setEntryDate] = useState(""); // YYYY-MM-DD
  const [durationDays, setDurationDays] = useState("30");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const cc = countryCode.trim().toUpperCase();
    const label = visaLabel.trim();
    const dd = durationDays.trim();

    if (cc.length !== 2) {
      Alert.alert("Invalid country code", "Use a 2-letter code like VN, TH, JP.");
      return;
    }
    if (!label) {
      Alert.alert("Missing visa label", "Example: Tourist, Business, Student.");
      return;
    }
    if (!isValidDateYYYYMMDD(entryDate)) {
      Alert.alert(
        "Invalid entry date",
        "Use format YYYY-MM-DD (example: 2026-01-14)."
      );
      return;
    }

    const days = Number(dd);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      Alert.alert("Invalid duration", "Duration must be between 1 and 365 days.");
      return;
    }

    const visa: Visa = {
      id: `visa_${Date.now()}`,
      countryCode: cc,
      visaLabel: label,
      entryDate,
      durationDays: days,
      createdAt: new Date().toISOString(),
      notificationIds: [],
    };

    try {
      setSaving(true);

      // Schedule notifications (mobile only)
      if (Platform.OS !== "web") {
        const hasPerm = await ensureNotifPermission();

        if (hasPerm) {
          const reminderSettings = await getReminderSettings();
          const expiryUTC = addDaysUTC(entryDate, days);
          const remindDays = reminderSettings.offsetsDays;
          const scheduledIds: string[] = [];

          for (const d of remindDays) {
            const fireUTC = new Date(expiryUTC);
            fireUTC.setUTCDate(fireUTC.getUTCDate() - d);

            const fireLocal = atLocalTime(
              fireUTC,
              reminderSettings.hour,
              reminderSettings.minute
            );

            const id = await scheduleVisaReminder({
              title: "Visa reminder",
              body:
                d === 0
                  ? `Your ${cc} visa expires today.`
                  : `Your ${cc} visa expires in ${d} day(s).`,
              date: fireLocal,
            });

            if (id) scheduledIds.push(id);
          }

          visa.notificationIds = scheduledIds;
        }
      }

      await saveVisa(visa);

      // reliable on web + mobile
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0B2E4A", "#0F3A5F"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Add Visa</Text>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Country Code</Text>
              <Text style={styles.inputHint}>2-letter code (e.g., VN, TH, JP)</Text>
              <TextInput
                value={countryCode}
                onChangeText={setCountryCode}
                autoCapitalize="characters"
                maxLength={2}
                placeholder="VN"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Visa Label</Text>
              <Text style={styles.inputHint}>Type of visa</Text>
              <TextInput
                value={visaLabel}
                onChangeText={setVisaLabel}
                placeholder="Tourist"
                placeholderTextColor="#999"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Entry Date</Text>
              <Text style={styles.inputHint}>Format: YYYY-MM-DD</Text>
              <TextInput
                value={entryDate}
                onChangeText={setEntryDate}
                placeholder="2026-01-14"
                placeholderTextColor="#999"
                keyboardType="numbers-and-punctuation"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration</Text>
              <Text style={styles.inputHint}>Number of days (1-365)</Text>
              <TextInput
                value={durationDays}
                onChangeText={setDurationDays}
                placeholder="30"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              saving && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
          >
            <Ionicons
              name={saving ? "hourglass-outline" : "checkmark-circle-outline"}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save Visa"}
            </Text>
          </Pressable>

          <View style={styles.infoContainer}>
            <Ionicons name="notifications-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              Reminders will be scheduled based on your settings.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontWeight: "700",
    fontSize: 15,
    color: "#0B2E4A",
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 13,
    color: "#888",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#F4F6F8",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#0B2E4A",
    fontWeight: "500",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F3A5F",
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#0B2E4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    flex: 1,
  },
});
