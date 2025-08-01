// This file is no longer used for the primary database logic, 
// as we have moved to using Firebase Firestore.
// It is kept for reference or if you want to switch back to a memory store.

import type { GiftDrop } from './types';

// In-memory store for demonstration purposes.
// In a real application, you would use a database like Firestore.
const drops = new Map<string, GiftDrop>();

export const memoryDb = {
  drops,
};
