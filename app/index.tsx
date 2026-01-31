import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getVisas, Visa, deleteVisa } from "../services/storage";
import { cancelScheduled } from "../services/notifications";
import { isOnboardingDone } from "../services/settings";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

/* ---------------- helpers ---------------- */

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysBetweenUTC(a: Date, b: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a0 = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const b0 = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((b0 - a0) / msPerDay);
}

function computeCountdown(v: Visa) {
  const expiry = addDays(v.entryDate, v.durationDays);
  const today = new Date();
  const daysRemaining = daysBetweenUTC(today, expiry);
  return { expiry, daysRemaining };
}

type VisaCardItem = Visa & {
  expiryISO: string;
  daysRemaining: number;
};

/* ---------------- screen ---------------- */

export default function Home() {
  const router = useRouter();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const load = useCallback(async () => {
    const v = await getVisas();
    setVisas(v);
  }, []);

  /* onboarding guard */
  useEffect(() => {
    (async () => {
      const done = await isOnboardingDone();
      if (!done) {
        router.replace("/onboarding");
        return;
      }
      setCheckingOnboarding(false);
    })();
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const data: VisaCardItem[] = useMemo(() => {
    const withCountdown = visas.map((v) => {
      const { expiry, daysRemaining } = computeCountdown(v);
      return {
        ...v,
        expiryISO: expiry.toISOString().slice(0, 10),
        daysRemaining,
      };
    });

    function rank(x: VisaCardItem) {
      if (x.daysRemaining < 0) return 0;
      if (x.daysRemaining <= 6) return 1;
      if (x.daysRemaining <= 14) return 2;
      return 3;
    }

    return [...withCountdown].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.daysRemaining - b.daysRemaining;
    });
  }, [visas]);

  if (checkingOnboarding) {
    return <View style={{ flex: 1, backgroundColor: "#F4F6F8" }} />;
  }

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#0B2E4A", "#0F3A5F"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../assets/images/overstayr-logo.png")}
              style={styles.logo}
            />
            <Text style={styles.headerTitle}>Overstayr</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <Pressable
          onPress={() => router.push("/add")}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Visa</Text>
        </Pressable>

        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyIcon}>✈️</Text>
            </View>
            <Text style={styles.emptyTitle}>No visas yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first visa to start tracking your countdown.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const expired = item.daysRemaining < 0;

              const status = expired
                ? "expired"
                : item.daysRemaining <= 6
                ? "urgent"
                : item.daysRemaining <= 14
                ? "warning"
                : "safe";

              const badge = {
                safe: { label: "SAFE", bg: "#E8F7EE", fg: "#116A2E" },
                warning: { label: "WARNING", bg: "#FFF7E6", fg: "#8A5A00" },
                urgent: { label: "URGENT", bg: "#FFECEC", fg: "#8A1F1F" },
                expired: { label: "EXPIRED", bg: "#F2F2F2", fg: "#333333" },
              }[status];

              const accent = {
                safe: "#2ECC71",
                warning: "#F5B301",
                urgent: "#E74C3C",
                expired: "#888888",
              }[status];

              async function onDelete() {
                Alert.alert(
                  "Delete visa?",
                  "This will remove the visa and cancel its reminders.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        if (item.notificationIds?.length) {
                          await cancelScheduled(item.notificationIds);
                        }
                        await deleteVisa(item.id);
                        await load();
                      },
                    },
                  ]
                );
              }

              return (
                <View style={[styles.card, { borderLeftColor: accent }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {item.countryCode} • {item.visaLabel}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.fg }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDetails}>
                    Entry: {item.entryDate} • Duration: {item.durationDays} days
                  </Text>
                  <Text style={styles.cardDetails}>
                    Expires: {item.expiryISO}
                  </Text>

                  <Text style={[styles.countdown, { color: accent }]}>
                    {expired
                      ? `Expired ${Math.abs(item.daysRemaining)} day(s) ago`
                      : `${item.daysRemaining} day(s) left`}
                  </Text>

                  <Pressable onPress={onDelete} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={16} color="#C0392B" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  settingsButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  addButton: {
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
    marginBottom: 20,
  },
  addButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B2E4A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  listContent: {
    gap: 14,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B2E4A",
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  cardDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  countdown: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: "900",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  deleteText: {
    color: "#C0392B",
    fontSize: 14,
    fontWeight: "600",
  },
});
