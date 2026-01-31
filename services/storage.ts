import AsyncStorage from "@react-native-async-storage/async-storage";

export type Visa = {
  id: string;
  countryCode: string;
  visaLabel: string;
  entryDate: string;
  durationDays: number;
  createdAt: string;
  notificationIds?: string[];
};

const KEY = "visas";

export async function getVisas(): Promise<Visa[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveVisa(v: Visa): Promise<void> {
  const visas = await getVisas();
  visas.push(v);
  await AsyncStorage.setItem(KEY, JSON.stringify(visas));
}

export async function clearVisas(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function deleteVisa(id: string): Promise<void> {
  const visas = await getVisas();
  const next = visas.filter((v) => v.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
