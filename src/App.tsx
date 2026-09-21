import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenId, LanguageCode, ProductItem, ActivityItem, ArtisanProfile, StoryAvatar } from './types';
import { INITIAL_ARTISAN, INITIAL_PRODUCTS, INITIAL_ACTIVITIES, ARTISAN_STORIES, DEFAULT_ARTISAN_AVATAR } from './data/mockData';
import { TopAppBar } from './components/layout/TopAppBar';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { OnboardingFlow, OnboardingUserData } from './components/onboarding/OnboardingFlow';
import { HomeScreen } from './components/sections/HomeScreen';
import { AIStudioScreen } from './components/sections/AIStudioScreen';
import { AutoCatalogerScreen } from './components/sections/AutoCatalogerScreen';
import { SmartPricingScreen } from './components/sections/SmartPricingScreen';
import { B2BIntegrationScreen } from './components/sections/B2BIntegrationScreen';
import { BusinessDashboardScreen } from './components/sections/BusinessDashboardScreen';
import { NotificationsScreen } from './components/sections/NotificationsScreen';
import { SocialShareScreen } from './components/sections/SocialShareScreen';
import { HeritageStoryScreen } from './components/sections/HeritageStoryScreen';
import { ProfileScreen } from './components/sections/ProfileScreen';
import { SettingsScreen } from './components/sections/SettingsScreen';
import { ShilpiVoiceFAB } from './components/voice/ShilpiVoiceFAB';
import { ShilpiVoiceModal } from './components/voice/ShilpiVoiceModal';
import { sound } from './services/sound';
import { useLanguage } from './context/LanguageContext';
import { useAdminMode } from './context/AdminModeContext';
import { api } from './services/api';
import {
  upsertSupabaseProfile,
  isSupabaseConfigured,
  supabase,
  saveCraftToSupabase,
  fetchUserCraftsFromSupabase,
} from './services/supabase';

export function App() {
  const { language, setLanguage } = useLanguage();
  const { isAdminMode, exitAdminMode } = useAdminMode();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_auth_done') === 'true';
  });
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('shilpsetu_theme') === 'dark';
  });
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // App State with localStorage persistence
  const [artisan, setArtisan] = useState<ArtisanProfile>(() => {
    const saved = localStorage.getItem('shilpsetu_artisan');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isOldUnsplash = parsed.avatarUrl?.includes('photo-1544005313-94ddf0286df2');
        return {
          ...INITIAL_ARTISAN,
          ...parsed,
          avatarUrl: isOldUnsplash || !parsed.avatarUrl ? DEFAULT_ARTISAN_AVATAR : parsed.avatarUrl,
          gender: parsed.gender || 'male',
          trustScore: parsed.trustScore ?? INITIAL_ARTISAN.trustScore ?? 98,
        };
      } catch (_) {}
    }
    return INITIAL_ARTISAN;
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem('shilpsetu_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => {
            if (
              p.polishedImageUrl?.includes('photo-1607344645866') ||
              p.imageUrl?.includes('photo-1607344645866') ||
              p.rawImageUrl?.includes('photo-1607344645866')
            ) {
              return {
                ...p,
                imageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
                polishedImageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
                rawImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
              };
            }
            return p;
          });
        }
      } catch (_) {}
    }
    return INITIAL_PRODUCTS;
  });
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [stories] = useState<StoryAvatar[]>(ARTISAN_STORIES);

  // Sync products and artisan profile from backend
  useEffect(() => {
    api.getProducts().then((serverProducts) => {
      if (serverProducts && serverProducts.length > 0) {
        setProducts((prev) => {
          const sanitizedServer = serverProducts.map((p) => {
            if (
              (p as any).imageUrl?.includes('photo-1607344645866') ||
              p.polishedImageUrl?.includes('photo-1607344645866') ||
              p.rawImageUrl?.includes('photo-1607344645866')
            ) {
              return {
                ...p,
                rawImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
                polishedImageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
              };
            }
            return p;
          });
          const existingIds = new Set(prev.map((p) => p.id));
          const toAdd = sanitizedServer.filter((p) => !existingIds.has(p.id));
          const updatedPrev = prev.map((p) => {
            if (
              p.polishedImageUrl?.includes('photo-1607344645866') ||
              (p as any).imageUrl?.includes('photo-1607344645866') ||
              p.rawImageUrl?.includes('photo-1607344645866')
            ) {
              return {
                ...p,
                rawImageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
                polishedImageUrl: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80',
              };
            }
            return p;
          });
          if (toAdd.length === 0) {
            localStorage.setItem('shilpsetu_products', JSON.stringify(updatedPrev));
            return updatedPrev;
          }
          const merged = [...toAdd, ...updatedPrev];
          localStorage.setItem('shilpsetu_products', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.warn);

    api.getArtisanProfile().then((serverProfile) => {
      if (serverProfile) {
        setArtisan((prev) => {
          const isMockServer =
            serverProfile.id === 'artisan_demo' ||
            serverProfile.name === 'Ramesh Kumar' ||
            serverProfile.name === 'Radha Devi' ||
            serverProfile.name === 'Ranjit Prajapati';
          const hasCustomPrevName =
            prev.name &&
            prev.name !== 'Ramesh Kumar' &&
            prev.name !== 'Radha Devi' &&
            prev.name !== 'Ranjit Prajapati' &&
            prev.name !== 'Master Artisan';

          if (hasCustomPrevName && isMockServer) {
            return prev;
          }

          const merged = { ...prev, ...serverProfile };
          localStorage.setItem('shilpsetu_artisan', JSON.stringify(merged));
          return merged;
        });
      }
    }).catch(console.warn);
  }, []);

  // Check active Supabase session for seamless cross-environment auth recovery
  useEffect(() => {
    if (isSupabaseConfigured()) {
      const syncProfileFromSession = async (session: any) => {
        if (!session?.user) return;
        if (session.access_token) {
          localStorage.setItem('shilpsetu_token', session.access_token);
        }
        // Only mark onboarding as completed if the user has already finalized onboarding
        if (localStorage.getItem('shilpsetu_auth_done') === 'true') {
          setHasCompletedOnboarding(true);
        }

        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const registeredName =
            prof?.full_name?.trim() ||
            session.user.user_metadata?.full_name?.trim() ||
            session.user.user_metadata?.name?.trim();

          if (prof?.preferred_language) {
            setLanguage(prof.preferred_language as LanguageCode);
            localStorage.setItem('shilpsetu_lang', prof.preferred_language);
          }

          if (registeredName || prof) {
            setArtisan((prev) => {
              const rawLoc = prof?.location || '';
              const state = rawLoc.includes(',') ? rawLoc.split(',')[1].trim() : prev.state;
              const city = rawLoc.includes(',') ? rawLoc.split(',')[0].trim() : prev.city;
              const merged = {
                ...prev,
                name: registeredName || prev.name,
                email: prof?.email || session.user.email || prev.email,
                mobile: prof?.mobile_number || session.user.user_metadata?.mobile_number || prev.mobile,
                craft: prof?.craft_specialty || prev.craft,
                location: prof?.location || prev.location,
                avatarUrl: prof?.avatar_url || prev.avatarUrl,
                bio: prof?.bio || prev.bio,
                state: state || prev.state,
                city: city || prev.city,
              };
              localStorage.setItem('shilpsetu_artisan', JSON.stringify(merged));
              return merged;
            });
          }
        } catch (_) {}
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncProfileFromSession(session);
        }
      }).catch(console.warn);

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          syncProfileFromSession(session);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Persist theme changes
  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('shilpsetu_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSetTheme = (theme: 'light' | 'dark') => {
    const nextIsDark = theme === 'dark';
    setIsDark(nextIsDark);
    localStorage.setItem('shilpsetu_theme', theme);
  };

  // Sync dark class on document root and body to decouple from OS preference
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  // Persist language changes
  const handleLanguageChange = (newLang: LanguageCode) => {
    setLanguage(newLang);
    localStorage.setItem('shilpsetu_lang', newLang);
  };

  // Persist artisan profile changes safely
  const handleUpdateArtisan = (updated: ArtisanProfile) => {
    setArtisan(updated);
    try {
      localStorage.setItem('shilpsetu_artisan', JSON.stringify(updated));
    } catch (err) {
      console.warn('[Storage] Quota exceeded when saving artisan profile:', err);
    }
    api.updateArtisanProfile(updated).catch(console.warn);

    // Also sync to Supabase profile in background if available
    try {
      upsertSupabaseProfile({
        fullName: updated.name,
        mobileNumber: updated.mobile || '',
        email: updated.email || '',
        craftSpecialty: updated.craft,
        location: updated.location,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        preferredLanguage: language,
        desiredWorkshop: updated.craft,
      }).catch((sbErr) => {
        console.warn('[Supabase Sync Warning]:', sbErr);
      });
    } catch (_) {}
  };

  // Persist product stock changes
  const handleUpdateProductStock = (productId: string, newStock: number) => {
    setProducts((prev) => {
      const updated = prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p
      );
      localStorage.setItem('shilpsetu_products', JSON.stringify(updated));
      return updated;
    });
    api.updateProductStock(productId, newStock).catch(console.warn);
  };

  // Scroll listener for sticky app bar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user crafts from Supabase and merge with showcase catalog
  useEffect(() => {
    fetchUserCraftsFromSupabase(artisan.id)
      .then((crafts) => {
        if (crafts && crafts.length > 0) {
          const customProducts: ProductItem[] = crafts.map((c: any) => ({
            id: c.id,
            title: c.title,
            category: 'Handcrafted Heritage',
            rawImageUrl: c.image_url,
            polishedImageUrl: c.image_url,
            price: Number(c.price) || 1200,
            description: c.description || c.story || '',
            materials:
              typeof c.materials === 'string'
                ? c.materials.split(',').map((m: string) => m.trim())
                : c.materials || [],
            hoursWorked: 8,
            materialCost: Math.round((Number(c.price) || 1200) * 0.25),
            stock: 8,
            status: 'live',
            dateAdded: 'Recently',
            gemSyncStatus: 'synced',
          }));

          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = customProducts.filter((p) => !existingIds.has(p.id));
            if (newOnes.length > 0) {
              const merged = [...newOnes, ...prev];
              localStorage.setItem('shilpsetu_products', JSON.stringify(merged));
              return merged;
            }
            return prev;
          });
        }
      })
      .catch(console.warn);
  }, [artisan.id]);

  const handleAddProduct = (newProduct: ProductItem) => {
    setProducts((prev) => {
      const updated = [newProduct, ...prev];
      localStorage.setItem('shilpsetu_products', JSON.stringify(updated));
      return updated;
    });
    api.createProduct(newProduct).catch(console.warn);

    // Persist craft to Supabase public.crafts and backend storage
    saveCraftToSupabase({
      id: newProduct.id,
      userId: artisan.id,
      title: newProduct.title,
      description: newProduct.description,
      price: newProduct.price,
      materials: newProduct.materials,
      imageUrl: newProduct.polishedImageUrl || newProduct.rawImageUrl,
    }).catch(console.warn);

    // Add new activity
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      title: 'New Listing Published',
      description: `${newProduct.title} created with multilingual voice cataloger.`,
      timestamp: 'Just now',
      type: 'listing_published',
      statusTag: 'Live on GeM',
      thumbnailUrl: newProduct.polishedImageUrl,
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: ProductItem) => {
    setProducts((prev) => {
      const updated = prev.map((product) => product.id === updatedProduct.id ? updatedProduct : product);
      localStorage.setItem('shilpsetu_products', JSON.stringify(updated));
      return updated;
    });
    api.updateProduct?.(updatedProduct.id, updatedProduct).catch(console.warn);
  };

  const handleLogout = () => {
    sound.playTap();
    localStorage.removeItem('shilpsetu_auth_done');
    localStorage.removeItem('shilpsetu_token');
    if (isSupabaseConfigured()) {
      supabase.auth.signOut().catch(() => {});
    }
    if (isAdminMode) {
      exitAdminMode();
    }
    setHasCompletedOnboarding(false);
    setCurrentScreen('home');
  };

  const handleOnboardingComplete = (data: OnboardingUserData) => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('shilpsetu_auth_done', 'true');

    if (data.selectedLanguage) {
      handleLanguageChange(data.selectedLanguage);
    }

    const craftTitles: Record<string, { title: string; craft: string }> = {
      pottery: { title: 'Master Clay Sculptor & Potter', craft: 'Terracotta & Heritage Pottery' },
      weaving: { title: 'Master Handloom Weaver', craft: 'Banarasi Handloom Weaving' },
      woodwork: { title: 'Master Wood Sculptor', craft: 'Channapatna Wooden Toys' },
      metalwork: { title: 'Master Brass Artisan', craft: 'Heritage Metal & Brass Craft' },
      jewelry: { title: 'Master Jewelry Maker', craft: 'Artisan Kundan & Meenakari' },
      painting: { title: 'Master Folk Painter', craft: 'Madhubani & Heritage Painting' },
    };

    const craftInfo = craftTitles[data.selectedCraft] || {
      title: 'Master Heritage Artisan',
      craft: 'Traditional Indian Handicrafts',
    };

    const userLocation =
      data.city && data.state ? `${data.city.trim()}, ${data.state.trim()}` : artisan.location;

    const registeredName =
      data.fullName?.trim() ||
      (isAdminMode
        ? 'Admin Artisan'
        : artisan.name &&
          artisan.name !== 'Ranjit Prajapati' &&
          artisan.name !== 'Radha Devi' &&
          artisan.name !== 'Ramesh Kumar'
        ? artisan.name
        : 'Master Artisan');

    const updatedArtisan: ArtisanProfile = {
      ...artisan,
      name: registeredName,
      gender: data.gender || 'male',
      avatarUrl: DEFAULT_ARTISAN_AVATAR,
      location: userLocation || (isAdminMode ? 'New Delhi, Delhi' : artisan.location),
      mobile: data.mobile?.trim() || (isAdminMode ? '9999999999' : artisan.mobile),
      email: data.email?.trim() ? data.email.trim() : (isAdminMode ? 'admin@shilpsetu.in' : undefined),
      craft: isAdminMode ? 'Heritage Craft Curation & Governance' : craftInfo.craft,
      title: isAdminMode ? 'System Administrator & Master Curator' : craftInfo.title,
    };

    handleUpdateArtisan(updatedArtisan);
    if (isSupabaseConfigured()) {
      supabase.auth.updateUser({
        data: {
          full_name: updatedArtisan.name,
          mobile_number: updatedArtisan.mobile,
        },
      }).catch(() => {});
    }
    upsertSupabaseProfile({
      fullName: updatedArtisan.name,
      email: updatedArtisan.email,
      mobileNumber: updatedArtisan.mobile,
      preferredLanguage: data.selectedLanguage || language,
      desiredWorkshop: data.selectedCraft,
      location: userLocation,
      craftSpecialty: craftInfo.craft,
      avatarUrl: updatedArtisan.avatarUrl,
      bio: updatedArtisan.bio,
    }).then((result) => {
      if (!result.saved && !result.localOnly) {
        console.warn('[Profile persistence note]:', result.error);
      }
    }).catch((error) => console.warn('[Profile persistence note]:', error?.message || error));
  };

  // If onboarding / login is not completed, isolate the landing flow so no dashboard cards bleed through
  if (!hasCompletedOnboarding) {
    return (
      <div
        className={`min-h-screen w-full font-sans transition-colors duration-300 ${
          isAdminMode ? 'selection:bg-emerald-600/30' : 'selection:bg-[#B5451B]/30'
        } ${
          isDark ? 'bg-[#121212] text-[#F4ECDE]' : 'bg-[#F4ECDE] text-[#1A1815]'
        }`}
      >
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          onSetTheme={handleSetTheme}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex font-sans relative transition-colors duration-300 ${
        isAdminMode ? 'selection:bg-emerald-600/20' : 'selection:bg-[#B5451B]/20'
      } ${
        isDark ? 'bg-[#121411] text-[#F4ECDE]' : 'bg-[#F4ECDE] text-[#1A1815]'
      }`}
    >

      {/* Desktop Sidebar Navigation (Visible on md+ screens) */}
      <DesktopSidebar
        currentScreen={currentScreen}
        artisan={artisan}
        onNavigate={(screen) => {
          sound.playTap();
          setCurrentScreen(screen);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        language={language}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
      />

      {/* Main Responsive Application Stage */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen relative transition-colors duration-300 ${
          isDark ? 'bg-[#121411]' : 'bg-[#F4ECDE] khadi-bg'
        }`}
      >
        {/* Offline Banner */}
        <OfflineBanner
          isOffline={isOffline}
          onToggleSimulatedOffline={() => setIsOffline(false)}
        />

        {/* Top App Bar */}
        <TopAppBar
          currentScreen={currentScreen}
          artisan={artisan}
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
          onNavigate={(screen) => {
            sound.playTap();
            setCurrentScreen(screen);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isScrolled={isScrolled}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        />

        {/* Main Content Stage with Screen Transition Animation */}
        <main className="flex-1 w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full"
            >
              {currentScreen === 'home' && (
                <HomeScreen
                  artisan={artisan}
                  products={products}
                  activities={activities}
                  stories={stories}
                  isDark={isDark}
                  language={language}
                  onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'studio' && (
                <AIStudioScreen
                  products={products}
                  language={language}
                  isDark={isDark}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'cataloger' && (
                <AutoCatalogerScreen
                  products={products}
                  onAddProduct={handleAddProduct}
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'pricing' && (
                <SmartPricingScreen
                  products={products}
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'b2b' && (
                <B2BIntegrationScreen
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'dashboard' && (
                <BusinessDashboardScreen
                  products={products}
                  onUpdateStock={handleUpdateProductStock}
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'notifications' && (
                <NotificationsScreen
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'social' && (
                <SocialShareScreen
                  products={products}
                  artisan={artisan}
                  isDark={isDark}
                  language={language}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'story' && (
                <HeritageStoryScreen
                  artisan={artisan}
                  language={language}
                  isDark={isDark}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'profile' && (
                <ProfileScreen
                  artisan={artisan}
                  onUpdateArtisan={handleUpdateArtisan}
                  isDark={isDark}
                  language={language}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {currentScreen === 'settings' && (
                <SettingsScreen
                  isOffline={isOffline}
                  onToggleOffline={() => setIsOffline(!isOffline)}
                  onNavigate={(scr) => {
                    sound.playTap();
                    setCurrentScreen(scr);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  isDark={isDark}
                  onToggleTheme={handleToggleTheme}
                  language={language}
                  onLogout={handleLogout}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Persistent Bottom Floating Pill Navigation */}
        <BottomNavBar
          currentScreen={currentScreen}
          isDark={isDark}
          language={language}
          onNavigate={(scr) => {
            setCurrentScreen(scr);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Floating "Tap to Interact" Action Button for SHILPI AI */}
        <ShilpiVoiceFAB
          onClick={() => setIsVoiceModalOpen(true)}
          isDark={isDark}
          currentLanguage={language}
        />

        {/* SHILPI AI Interactive Conversational & Voice Assistant Modal */}
        <ShilpiVoiceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onNavigate={(screen) => {
            setCurrentScreen(screen);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLanguageChange={handleLanguageChange}
          onToggleTheme={handleToggleTheme}
          currentLanguage={language}
          artisan={artisan}
          products={products}
          isDark={isDark}
        />
      </div>
    </div>
  );
}

export default App;
