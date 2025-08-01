import type { GiftDrop } from './types';

// In-memory store for demonstration purposes.
// In a real application, you would use a database like Firestore.
const drops = new Map<string, GiftDrop>();

export const db = {
  drops,
};
