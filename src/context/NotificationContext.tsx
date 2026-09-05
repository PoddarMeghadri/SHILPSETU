import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScreenId } from '../types';
import { sound } from '../services/sound';

export interface NotificationItemData {
  id: string;
  category: 'order' | 'gem' | 'studio' | 'pricing' | 'story' | 'system';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  targetScreen?: ScreenId;
  icon: string;
  iconBg: string;
  badge?: string;
  amount?: string;
}

export const INITIAL_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: 'notif-1',
    category: 'gem',
    title: 'Govt Bulk Purchase Inbound',
    description: 'Ministry of External Affairs issued an official tender request for 250 Souvenir Urns.',
    timestamp: '15 mins ago',
    isRead: false,
    actionLabel: 'Review Tender in B2B',
    targetScreen: 'b2b',
    icon: 'account_balance',
    iconBg: 'bg-[#22331E] text-[#F4ECDE]',
    badge: 'Direct GeM',
    amount: '₹2,37,500',
  },
  {
    id: 'notif-2',
    category: 'order',
    title: 'New Customer Order #SHILP-4092',
    description: 'Aarav Mehta (Mumbai) ordered 2x Terracotta Water Pitchers. Ready for packing.',
    timestamp: '1 hour ago',
    isRead: false,
    actionLabel: 'View in Orders',
    targetScreen: 'dashboard',
    icon: 'shopping_bag',
    iconBg: 'bg-[#B5451B] text-white',
    badge: 'Prepaid (SBI Escrow)',
    amount: '₹1,900',
  },
  {
    id: 'notif-3',
    category: 'studio',
    title: '4K Studio Lighting Enhanced',
    description: 'Your photo for "Red Terracotta Urli Vase" has been upgraded with Warm 3200K studio lights.',
    timestamp: '3 hours ago',
    isRead: false,
    actionLabel: 'Open AI Studio',
    targetScreen: 'studio',
    icon: 'photo_camera',
    iconBg: 'bg-[#E8B84B] text-[#1A1815]',
    badge: '4K Ready',
  },
  {
    id: 'notif-4',
    category: 'pricing',
    title: 'Fair Margin Analysis Verified',
    description: 'Smart Pricing Assistant calculated +32% margin protection compared to middleman rates.',
    timestamp: 'Yesterday',
    isRead: true,
    actionLabel: 'Inspect Fair Price',
    targetScreen: 'pricing',
    icon: 'currency_rupee',
    iconBg: 'bg-[#22331E] text-[#E8B84B]',
    badge: 'Zero Middlemen',
  },
  {
    id: 'notif-5',
    category: 'story',
    title: 'Heritage Story Published Live',
    description: '"Three Generations of Soil & Wheel" voice story is now featured on your public storefront.',
    timestamp: '2 days ago',
    isRead: true,
    actionLabel: 'View Story',
    targetScreen: 'story',
    icon: 'history_edu',
    iconBg: 'bg-[#B5451B]/20 text-[#B5451B]',
    badge: 'Public Store',
  },
  {
    id: 'notif-6',
    category: 'system',
    title: 'Udyam Registration Verified',
    description: 'Your craft MSME credentials have been securely linked to Government e-Marketplace.',
    timestamp: '3 days ago',
    isRead: true,
    actionLabel: 'View Profile',
    targetScreen: 'profile',
    icon: 'verified',
    iconBg: 'bg-[#22331E] text-[#F4ECDE]',
    badge: 'Govt Certified',
  },
];

export interface NotificationContextType {
  notifications: NotificationItemData[];
  unreadCount: number;
  markAllRead: () => void;
  markItemRead: (id: string) => void;
  deleteNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY = 'shilpsetu_notifications_v1';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const saveNotifications = (updated: NotificationItemData[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = useCallback(() => {
    sound.playSuccess();
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const markItemRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const deleteNotification = useCallback((id: string) => {
    sound.playTap();
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markItemRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return a safe default fallback if accessed outside provider
    return {
      notifications: INITIAL_NOTIFICATIONS,
      unreadCount: INITIAL_NOTIFICATIONS.filter((n) => !n.isRead).length,
      markAllRead: () => {},
      markItemRead: () => {},
      deleteNotification: () => {},
    };
  }
  return context;
}
