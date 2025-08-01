'use server';

import { collection, addDoc, getDoc, doc, query, where, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GiftDrop } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// This is a placeholder, in a real app you'd get the user ID from the session
async function getUserId() {
    // For now, we'll use a static ID.
    // Replace this with actual auth logic.
    return 'static-user-id';
}

export async function createDrop(data: Omit<GiftDrop, 'id' | 'createdAt' | 'gifts' | 'userId' | 'status'> & {gifts: Omit<Gift, 'id'>[]}, userId: string): Promise<{ id: string }> {
  
  const newDropData = {
    ...data,
    userId,
    status: 'live' as const,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "drops"), newDropData);

  // Firestore doesn't immediately have the server timestamp, so we add gifts separately
  // so we can have stable gift IDs.
  const giftsWithIds = data.gifts.map((g, i) => ({ ...g, id: `${docRef.id}-gift-${i}` }));
  await updateDoc(docRef, { gifts: giftsWithIds });

  return { id: docRef.id };
}

export async function getDrop(id: string): Promise<GiftDrop | null> {
  const docRef = doc(db, 'drops', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  // Firestore timestamps need to be converted
  const createdAt = (data.createdAt as Timestamp)?.toMillis() || Date.now();

  return { ...data, id: docSnap.id, createdAt } as GiftDrop;
}


export async function getUserDrops(userId: string): Promise<GiftDrop[]> {
    const q = query(collection(db, "drops"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const drops: GiftDrop[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = (data.createdAt as Timestamp)?.toMillis() || Date.now();
        drops.push({ ...data, id: doc.id, createdAt } as GiftDrop);
    });
    return drops.sort((a, b) => b.createdAt - a.createdAt);
}


export async function selectGift(dropId: string, giftId: string): Promise<{ success: boolean }> {
  try {
    const dropRef = doc(db, 'drops', dropId);
    await updateDoc(dropRef, { selectedGiftId: giftId, recipientOpenedAt: serverTimestamp() });
    revalidatePath(`/drop/${dropId}`);
    return { success: true };
  } catch (error) {
    console.error("Error selecting gift: ", error);
    return { success: false };
  }
}

export async function saveRecipientDetails(dropId: string, details: {name: string, address: string}): Promise<{ success: boolean }> {
  try {
    const dropRef = doc(db, 'drops', dropId);
    await updateDoc(dropRef, { recipientDetails: details });
    revalidatePath(`/drop/${dropId}`);
    return { success: true };
  } catch (error) {
    console.error("Error saving details: ", error);
    return { success: false };
  }
}
