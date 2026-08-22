import { randomUUID } from 'expo-crypto';

import { db } from '@/db/client';
import { profiles } from '@/db/schema';

export interface NewProfile {
  name: string;
  age: number | null;
  hairLossType: string | null;
}

export async function getProfile() {
  const rows = await db.select().from(profiles).limit(1);
  return rows[0] ?? null;
}

export async function createProfile(input: NewProfile) {
  const id = randomUUID();
  await db.insert(profiles).values({
    id,
    name: input.name,
    age: input.age,
    hairLossType: input.hairLossType,
  });
  return id;
}
