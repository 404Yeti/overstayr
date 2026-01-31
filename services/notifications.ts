import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Show notifications even when app is foregrounded (nice for testing)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotifPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

// Helper: schedule a notification at local device time
export async function scheduleVisaReminder(params: {
  title: string;
  body: string;
  date: Date;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const now = new Date();
  if (params.date <= now) return null; // don't schedule in the past

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: params.title, body: params.body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.date,
    },
  });

  return id;
}

export async function cancelScheduled(ids: string[]) {
  if (Platform.OS === "web") return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}
