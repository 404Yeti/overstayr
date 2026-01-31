import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ONBOARDING_DONE = "onboarding_done";
const KEY_NOTIF_ENABLED = "notif_enabled";
const KEY_REMINDER_HOUR = "reminder_hour";
const KEY_REMINDER_MIN = "reminder_min";
const KEY_REMINDER_OFFSETS = "reminder_offsets_days"; // JSON array like [14,7,3,1]

export type ReminderSettings = {
  enabled: boolean;
  hour: number;      // 0-23
  minute: number;    // 0-59
  offsetsDays: number[]; // e.g. [14, 7, 3, 1]
};

const DEFAULTS: ReminderSettings = {
  enabled: true,
  hour: 9,
  minute: 0,
  offsetsDays: [14, 7, 3, 0],
};

/* ---------- onboarding ---------- */

export async function isOnboardingDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
  return v === "1";
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_DONE, "1");
}

export async function clearOnboardingDone(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ONBOARDING_DONE);
}

/* ---------- reminders ---------- */

export async function getReminderSettings(): Promise<ReminderSettings> {
  const [enabledStr, hourStr, minStr, offsetsStr] = await Promise.all([
    AsyncStorage.getItem(KEY_NOTIF_ENABLED),
    AsyncStorage.getItem(KEY_REMINDER_HOUR),
    AsyncStorage.getItem(KEY_REMINDER_MIN),
    AsyncStorage.getItem(KEY_REMINDER_OFFSETS),
  ]);

  const enabled =
    enabledStr === null ? DEFAULTS.enabled : enabledStr === "1";

  const hour =
    hourStr === null ? DEFAULTS.hour : clampInt(Number(hourStr), 0, 23, DEFAULTS.hour);

  const minute =
    minStr === null ? DEFAULTS.minute : clampInt(Number(minStr), 0, 59, DEFAULTS.minute);

  let offsetsDays = DEFAULTS.offsetsDays;
  if (offsetsStr) {
    try {
      const parsed = JSON.parse(offsetsStr);
      if (Array.isArray(parsed) && parsed.every((x) => Number.isFinite(x))) {
        offsetsDays = parsed.map((x) => Number(x)).filter((x) => x >= 0 && x <= 365);
      }
    } catch {
      // ignore bad data
    }
  }

  return { enabled, hour, minute, offsetsDays };
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_NOTIF_ENABLED, enabled ? "1" : "0");
}

export async function setReminderTime(hour: number, minute: number): Promise<void> {
  const h = clampInt(hour, 0, 23, DEFAULTS.hour);
  const m = clampInt(minute, 0, 59, DEFAULTS.minute);
  await Promise.all([
    AsyncStorage.setItem(KEY_REMINDER_HOUR, String(h)),
    AsyncStorage.setItem(KEY_REMINDER_MIN, String(m)),
  ]);
}

export async function setReminderOffsets(offsetsDays: number[]): Promise<void> {
  const clean = offsetsDays
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x >= 0 && x <= 365);

  await AsyncStorage.setItem(KEY_REMINDER_OFFSETS, JSON.stringify(clean));
}

export async function resetAllSettings(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEY_NOTIF_ENABLED),
    AsyncStorage.removeItem(KEY_REMINDER_HOUR),
    AsyncStorage.removeItem(KEY_REMINDER_MIN),
    AsyncStorage.removeItem(KEY_REMINDER_OFFSETS),
  ]);
}

/* ---------- helpers ---------- */

function clampInt(n: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  const x = Math.floor(n);
  if (x < min) return min;
  if (x > max) return max;
  return x;
}
