import { ArtisanProfile, ProductItem, ActivityItem, StoryAvatar, BulkInquiry, OrderItem, LanguageOption } from '../types';

// All 23 languages retained intact for Auto-Cataloger
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'brx', label: 'Bodo', nativeLabel: 'बड़ो' },
  { code: 'doi', label: 'Dogri', nativeLabel: 'डोगरी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ks', label: 'Kashmiri', nativeLabel: 'कॉशुर / کٲشُر' },
  { code: 'kok', label: 'Konkani', nativeLabel: 'कोंकणी' },
  { code: 'mai', label: 'Maithili', nativeLabel: 'मैथिली' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'mni', label: 'Manipuri', nativeLabel: 'মৈতৈলোন্' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'sa', label: 'Sanskrit', nativeLabel: 'संस्कृतम्' },
  { code: 'sat', label: 'Santali', nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', label: 'Sindhi', nativeLabel: 'सिन्धी / سنڌي' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اُردُو' },
];

/**
 * The 10 supported app languages for UI navigation & app language changing mechanism:
 * English, Hindi, Bengali, Kannada, Malayalam, Odia, Punjabi, Tamil, Telugu, Urdu.
 */
export const APP_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اُردُو' },
];

export interface ArtisanProfileWithAuth extends ArtisanProfile {
  mobile?: string;
  email?: string;
  recentPhotos?: string[];
}

// Default profile picture matching nopfp.jpg uploaded by user
export const DEFAULT_ARTISAN_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><rect width="240" height="240" fill="%23C4D5DD"/><circle cx="120" cy="106" r="41" fill="%23FFFFFF"/><path d="M 31 240 C 33 194, 69 158, 120 158 C 171 158, 207 194, 209 240 Z" fill="%23FFFFFF"/></svg>';

export const INITIAL_ARTISAN: ArtisanProfile & { mobile?: string; email?: string; recentPhotos?: string[] } = {
  name: 'Ranjit Prajapati',
  gender: 'male',
  title: 'Master Clay Sculptor & Potter',
  location: 'Varanasi, Uttar Pradesh',
  city: 'Varanasi',
  state: 'Uttar Pradesh',
  craft: 'Terracotta & Heritage Pottery',
  avatarUrl: DEFAULT_ARTISAN_AVATAR,
  completeness: 88,
  trustScore: 98,
  udyamNumber: 'UDYAM-UP-75-0029418',
  gemVerified: true,
  storyQuote: 'Every lump of earth holds a song that only patient hands can uncover.',
  bio: 'Third-generation terracotta artisan shaping sustainable earthenware, temple lamps, and bespoke architectural murals with local riverbed clay.',
  mobile: '9876543210',
  email: '',
  recentPhotos: [],
};

import { CRAFT_MOCK_DATA } from './craftMockData';
import { ARTISAN_STORIES_DATA } from './artisanStoriesData';

export const INITIAL_PRODUCTS: ProductItem[] = CRAFT_MOCK_DATA;

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Photo Enhanced by AI Studio',
    description: 'Handcrafted Red Terracotta Urli Vase converted to 4K studio lighting with neutral backdrop.',
    timestamp: '12 mins ago',
    type: 'photo_enhanced',
    statusTag: 'Studio Ready',
    thumbnailUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'act-2',
    title: 'New Bulk Inquiry Received',
    description: 'Delhi Craft Council requested quotation for 500 Festival Terracotta Diyas.',
    timestamp: '2 hours ago',
    type: 'inquiry',
    statusTag: '₹48,000 Order',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'act-3',
    title: 'Listing Approved on GeM',
    description: 'Banarasi Zari Silk Saree catalog batch passed government quality audit.',
    timestamp: 'Yesterday',
    type: 'gem_approved',
    statusTag: 'Live on GeM',
    thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'act-4',
    title: 'Voice Story Translated to English',
    description: '"Three Generations of Wheel Pottery" story published to your artisan storefront.',
    timestamp: '2 days ago',
    type: 'listing_published',
    statusTag: 'SEO Ranked',
  },
];

export const ARTISAN_STORIES: StoryAvatar[] = ARTISAN_STORIES_DATA;

export const BULK_INQUIRIES: BulkInquiry[] = [
  {
    id: 'inq-101',
    buyerName: 'Ministry of External Affairs, India',
    buyerType: 'Govt Department',
    location: 'New Delhi, India',
    itemTitle: 'Handcrafted Terracotta Souvenir Urns (with Custom Seal)',
    quantity: 250,
    targetPrice: 950,
    requiredBy: 'Nov 15, 2026',
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=400&auto=format&fit=crop&q=80',
    notes: 'Official state diplomatic gift hampers for international trade delegates. Advance payment 40% upon confirmation.',
  },
  {
    id: 'inq-102',
    buyerName: 'FabIndia Heritage Collection',
    buyerType: 'Boutique Exporter',
    location: 'Bengaluru, India',
    itemTitle: 'Festive Clay Diya Thali Assortment (Pack of 12)',
    quantity: 600,
    targetPrice: 420,
    requiredBy: 'Oct 28, 2026',
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&auto=format&fit=crop&q=80',
    notes: 'Packaging boxes provided by buyer. Strict unbaked organic quality audit required.',
  },
  {
    id: 'inq-103',
    buyerName: 'Taj Heritage Hotels & Resorts',
    buyerType: 'Hospitality Group',
    location: 'Udaipur, Rajasthan',
    itemTitle: 'Large Architectural Terracotta Planters',
    quantity: 80,
    targetPrice: 2200,
    requiredBy: 'Dec 05, 2026',
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=400&auto=format&fit=crop&q=80',
    notes: 'For luxury palace courtyard renovation. Weather-treated unglazed terracotta required.',
  },
  {
    id: 'inq-104',
    buyerName: 'Ministry of Culture (GeM National Tender)',
    buyerType: 'Govt Department',
    location: 'New Delhi, India',
    itemTitle: 'Hand-Cast Brass Tribal Diyas & Ceremonial Bells',
    quantity: 500,
    targetPrice: 1250,
    requiredBy: 'Nov 30, 2026',
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&auto=format&fit=crop&q=80',
    notes: 'GeM Tender GEM/2026/B/891244. Official national heritage exhibition gifting. 100% direct bank escrow settlement.',
  },
  {
    id: 'inq-105',
    buyerName: 'ITC WelcomHeritage Luxury Resorts',
    buyerType: 'Corporate',
    location: 'Jaipur, Rajasthan',
    itemTitle: 'Terracotta Artisan Tea Sets (Set of 6)',
    quantity: 250,
    targetPrice: 1400,
    requiredBy: 'Dec 12, 2026',
    status: 'pending',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&auto=format&fit=crop&q=80',
    notes: 'Corporate Tender CORP/ITC/2026/782. Direct procurement for luxury resort welcome gifting with GI authenticity tags.',
  },
];

export const PENDING_ORDERS: OrderItem[] = [
  {
    id: 'ord-1',
    orderNumber: '#SHILP-4092',
    customerName: 'Aarav Mehta',
    location: 'Bandra West, Mumbai',
    itemTitle: 'Handcrafted Red Terracotta Urli Vase',
    itemImage: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=200&auto=format&fit=crop&q=80',
    price: 1200,
    quantity: 1,
    status: 'packing',
    time: '25 mins ago',
  },
  {
    id: 'ord-2',
    orderNumber: '#SHILP-4091',
    customerName: 'Pooja Singhania',
    location: 'Vasant Vihar, Delhi',
    itemTitle: 'Festive Terracotta Diya Set (Batch of 50)',
    itemImage: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=200&auto=format&fit=crop&q=80',
    price: 1850,
    quantity: 2,
    status: 'new',
    time: '2 hours ago',
  },
  {
    id: 'ord-3',
    orderNumber: '#SHILP-4088',
    customerName: 'Elena Rostova',
    location: 'Berlin, Germany (Export)',
    itemTitle: 'Carved Teak Keepsake Box',
    itemImage: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=200&auto=format&fit=crop&q=80',
    price: 2400,
    quantity: 1,
    status: 'shipped',
    time: 'Yesterday',
  },
];
