export interface Gift {
  id: string;
  name: string;
  image: string;
  platform?: string;
}

export type DistributionMode = 'random' | 'manual';

export interface GifterMedia {
  type: 'audio' | 'video' | 'card';
  url: string;
}

export interface RecipientDetails {
  name: string;
  address: string;
}

export interface GiftDrop {
  id: string;
  userId: string;
  title: string;
  message: string;
  gifts: Gift[];
  distributionMode: DistributionMode;
  gifterMedia?: GifterMedia;
  selectedGiftId?: string;
  recipientDetails?: RecipientDetails;
  createdAt: number; // Stored as a Unix timestamp (milliseconds)
  status: 'draft' | 'live';
  recipientOpenedAt?: number; // Stored as a Unix timestamp (milliseconds)
}
