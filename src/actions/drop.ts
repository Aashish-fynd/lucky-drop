'use server';

import { db } from '@/lib/db';
import type { GiftDrop, RecipientDetails } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function createDrop(data: Omit<GiftDrop, 'id' | 'createdAt' | 'gifts'> & {gifts: Omit<Gift, 'id'>[]}): Promise<{ id: string }> {
  const id = Math.random().toString(36).substring(2, 9);
  
  const newDrop: GiftDrop = {
    ...data,
    id,
    gifts: data.gifts.map((g, i) => ({ ...g, id: `${id}-gift-${i}` })),
    createdAt: Date.now(),
  };
  db.drops.set(id, newDrop);
  return { id };
}

export async function getDrop(id: string): Promise<GiftDrop | null> {
  const drop = db.drops.get(id) || null;
  // Deep copy to avoid server/client object mutation issues
  return drop ? JSON.parse(JSON.stringify(drop)) : null;
}

export async function selectGift(dropId: string, giftId: string): Promise<{ success: boolean }> {
  const drop = db.drops.get(dropId);
  if (!drop) {
    return { success: false };
  }
  drop.selectedGiftId = giftId;
  db.drops.set(dropId, drop);
  revalidatePath(`/drop/${dropId}`);
  return { success: true };
}

export async function saveRecipientDetails(dropId: string, details: RecipientDetails): Promise<{ success: boolean }> {
  const drop = db.drops.get(dropId);
  if (!drop) {
    return { success: false };
  }
  drop.recipientDetails = details;
  db.drops.set(dropId, drop);
  revalidatePath(`/drop/${dropId}`);
  return { success: true };
}
