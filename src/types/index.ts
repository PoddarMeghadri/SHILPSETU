export type ScreenId =
  | 'home'
  | 'studio'
  | 'cataloger'
  | 'pricing'
  | 'b2b'
  | 'dashboard'
  | 'notifications'
  | 'social'
  | 'story'
  | 'profile';

export type LanguageCode =
  | 'en'
  | 'as'
  | 'bn'
  | 'brx'
  | 'doi'
  | 'gu'
  | 'hi'
  | 'kn'
  | 'ks'
  | 'kok'
  | 'mai'
  | 'ml'
  | 'mni'
  | 'mr'
  | 'ne'
  | 'or'
  | 'pa'
  | 'sa'
  | 'sat'
  | 'sd'
  | 'ta'
  | 'te'
  | 'ur';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export interface ArtisanProfile {
  name: string;
  gender?: 'male' | 'female' | 'other';
  title: string;
  location: string;
  craft: string;
  avatarUrl: string;
  bannerUrl?: string;
  completeness: number; // 0 to 100
  trustScore?: number; // 0 to 100
  udyamNumber?: string;
  gemVerified: boolean;
  storyQuote: string;
  bio: string;
  mobile?: string;
  email?: string;
  recentPhotos?: string[];
}

export interface ProductItem {
  id: string;
  title: string;
  category: string;
  rawImageUrl: string;
  polishedImageUrl: string;
  price: number;
  originalPrice?: number;
  description: string;
  materials: string[];
  hoursWorked: number;
  materialCost: number;
  stock: number;
  status: 'draft' | 'in_progress' | 'live' | 'gem_approved' | 'review';
  inquiryCount?: number;
  dateAdded: string;
  gemSyncStatus: 'synced' | 'pending' | 'attention';
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'photo_enhanced' | 'listing_published' | 'order_received' | 'gem_approved' | 'inquiry';
  statusTag?: string;
  thumbnailUrl?: string;
}

export interface StoryAvatar {
  id: string;
  artisanName: string;
  craftType: string;
  location: string;
  avatarUrl: string;
  storySnippet: string;
  fullStory: string;
  quote: string;
  isViewed: boolean;
  artisanPhotoUrl: string;
}

export type StoryItem = StoryAvatar;

export interface BulkInquiry {
  id: string;
  buyerName: string;
  buyerType: 'Govt Department' | 'Corporate' | 'Boutique Exporter' | 'Hospitality Group';
  location: string;
  itemTitle: string;
  quantity: number;
  targetPrice: number;
  requiredBy: string;
  status: 'pending' | 'accepted' | 'declined';
  imageUrl: string;
  notes: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  location: string;
  itemTitle: string;
  itemImage: string;
  price: number;
  quantity: number;
  status: 'new' | 'packing' | 'shipped' | 'delivered';
  time: string;
}
