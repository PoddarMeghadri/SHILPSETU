import React, { useState } from 'react';
import { motion } from 'motion/react';
import { OrderItem, ScreenId, LanguageCode, ProductItem } from '../../types';
import { PENDING_ORDERS, INITIAL_PRODUCTS } from '../../data/mockData';
import { sound } from '../../services/sound';
import { SuccessModal } from '../common/SuccessModal';
import { useTranslation } from '../../services/translations';

interface BusinessDashboardProps {
  products?: ProductItem[];
  onUpdateStock?: (productId: string, newStock: number) => void;
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

type Period = 'today' | 'week' | 'month';

export const BusinessDashboardScreen: React.FC<BusinessDashboardProps> = ({
  products,
  onUpdateStock,
  onNavigate,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('week');
  const [orders, setOrders] = useState<OrderItem[]>(PENDING_ORDERS);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'healthy'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restockedItemTitle, setRestockedItemTitle] = useState<string | null>(null);

  const currentProducts = products && products.length > 0 ? products : INITIAL_PRODUCTS;
  const lowStockThreshold = 5;
  const lowStockProducts = currentProducts
    .filter((p) => (p.stock ?? 0) <= lowStockThreshold)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const criticalProducts = currentProducts.filter((p) => (p.stock ?? 0) <= 2);
  const healthyProducts = currentProducts.filter((p) => (p.stock ?? 0) > lowStockThreshold);
  const lowestProduct = lowStockProducts[0];

  const filteredProducts = currentProducts.filter((p) => {
    const title = (p.title || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = title.includes(q) || cat.includes(q);

    if (!matchesSearch) return false;

    const stockCount = p.stock ?? 0;
    if (inventoryFilter === 'low') {
      return stockCount <= lowStockThreshold;
    }
    if (inventoryFilter === 'healthy') {
      return stockCount > lowStockThreshold;
    }
    return true;
  });

  const handleStockChange = (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, (currentStock ?? 0) + delta);
    if (onUpdateStock) {
      onUpdateStock(productId, newStock);
    }
    if (delta > 0) {
      sound.playSuccess();
      const prod = currentProducts.find((p) => p.id === productId);
      if (prod) {
        setRestockedItemTitle(prod.title);
        setTimeout(() => setRestockedItemTitle(null), 3000);
      }
    } else {
      sound.playTap();
    }
  };

  // Dynamic metrics based on period
  const metrics = {
    today: { revenue: 3450, units: 4, aov: 860, views: 240 },
    week: { revenue: 14250, units: 18, aov: 1120, views: 1840 },
    month: { revenue: 68400, units: 76, aov: 1240, views: 7920 },
  }[period];

  const handleFulfill = (orderId: string) => {
    sound.playSuccess();
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'shipped' } : ord))
    );
    setShowSuccess(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Time Period Filter Pill Bar */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className={`font-serif font-bold text-xl sm:text-2xl ${isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'}`}>
            {t('screen_business', 'Artisan Business Analytics')}
          </h2>
          <p className="text-xs opacity-75 font-sans">
            {t('track_revenue_desc', 'Track revenue, fulfill dispatched orders, and manage stock.')}
          </p>
        </div>

        <div
          className={`flex p-1.5 rounded-2xl border ${
            isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-[#EFE4CF] border-[#22331E]/10'
          }`}
        >
          {(['today', 'week', 'month'] as Period[]).map((p) => {
            const isSelected = period === p;
            const label =
              p === 'today'
                ? t('today', 'Today')
                : p === 'week'
                ? t('this_week', 'This Week')
                : t('this_month', 'This Month');
            return (
              <button
                key={p}
                onClick={() => {
                  sound.playTap();
                  setPeriod(p);
                }}
                className={`px-4 py-2 text-xs font-serif font-bold rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#B5451B] text-white shadow-xs'
                    : isDark
                    ? 'text-[#F4ECDE]/70 hover:text-white'
                    : 'text-[#22331E]/70 hover:text-[#1A1815]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Revenue Card & Low-Stock Alert Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div
          className={`lg:col-span-8 rounded-3xl p-6 sm:p-7 border shadow-2xl relative overflow-hidden flex flex-col justify-between ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-44 h-44 bg-[#E8B84B]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-[#E8B84B]">
                {t('total_revenue', 'Total Craft Revenue')} ({period === 'today' ? t('today', 'Today') : period === 'week' ? t('this_week', 'This Week') : t('this_month', 'This Month')})
              </span>
              <span className="text-xs font-bold text-[#E8B84B] bg-[#E8B84B]/20 px-3 py-0.5 rounded-full border border-[#E8B84B]/30">
                {t('vs_last_period', '+24% vs last period')}
              </span>
            </div>

            <div>
              <motion.h2
                key={metrics.revenue}
                initial={{ opacity: 0.5, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-serif font-bold text-4xl sm:text-5xl text-white tracking-tight"
              >
                ₹{metrics.revenue.toLocaleString('en-IN')}
              </motion.h2>
              <p className="text-xs sm:text-sm text-white/80 font-sans mt-1">
                {t('across_gem_store', 'Across GeM Government Portal & Direct Digital Store')}
              </p>
            </div>

            {/* Quick 3-metric row */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
              <div>
                <p className="text-[10px] sm:text-xs text-white/60 uppercase">{t('units_sold', 'Units Sold')}</p>
                <p className="font-serif font-bold text-xl sm:text-2xl text-[#E8B84B]">{metrics.units}</p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-white/60 uppercase">{t('avg_order', 'Avg Order')}</p>
                <p className="font-serif font-bold text-xl sm:text-2xl text-[#E8B84B]">₹{metrics.aov}</p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-white/60 uppercase">{t('store_views', 'Store Views')}</p>
                <p className="font-serif font-bold text-xl sm:text-2xl text-[#E8B84B]">{metrics.views}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low-Stock Warning Alert Card (Dynamic - Enforced High-Contrast Terracotta Theme) */}
        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="bg-[#2A1713] border-2 border-[#B5451B]/60 rounded-3xl p-5 flex flex-col justify-center shadow-md relative overflow-hidden text-[#F4ECDE]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#B5451B]/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-[#B5451B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-xl text-white animate-pulse">warning</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <h5 className="font-serif font-bold text-sm text-[#FFA680]">
                    {t('low_inventory_alert', 'Low Inventory Alert')}
                  </h5>
                  {lowStockProducts.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B5451B] text-white shrink-0 shadow-xs">
                      {lowStockProducts.length} {t('low_stock', 'Low Stock')}
                    </span>
                  )}
                </div>
                {lowestProduct ? (
                  <>
                    <p className="text-xs text-[#F4ECDE] opacity-95 font-sans mt-1 leading-relaxed">
                      <strong className="font-bold text-[#FFA680]">{lowestProduct.title}</strong>{' '}
                      has only <span className="font-mono font-bold text-sm text-[#E8B84B] underline decoration-[#E8B84B]/70 underline-offset-2">{lowestProduct.stock} units left</span> in workshop stock.
                      {lowStockProducts.length > 1 && (
                        <span className="block mt-1 text-[11px] text-[#F4ECDE]/85">
                          Also low: <strong className="text-[#FFA680] font-bold">{lowStockProducts[1].title}</strong> (<span className="text-[#E8B84B] font-bold">{lowStockProducts[1].stock} units left</span>).
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        const el = document.getElementById('inventory-manager-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#B5451B] hover:bg-[#9E3913] text-white text-xs font-serif font-bold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-white">inventory_2</span>
                      <span className="text-white font-bold">{t('manage_inventory_now', 'Manage Inventory & Restock')}</span>
                      <span className="material-symbols-outlined text-xs text-white">arrow_downward</span>
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-[#F4ECDE]/80 font-sans mt-1 leading-relaxed">
                    {t('all_stock_healthy', 'All workshop craft products currently have healthy inventory levels.')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid: Donut + Revenue Area Curve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Chart 1: Donut (Sales by Craft Category) */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 ${
            isDark
              ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
              : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
          }`}
        >
          <div className="flex justify-between items-center">
            <h4 className="font-serif font-bold text-sm sm:text-base flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-[#B5451B]">pie_chart</span>
              {t('sales_by_category', 'Sales by Craft Category')}
            </h4>
            <span className="text-xs text-[#B5451B] font-bold">{t('top_pottery', 'Top: Pottery')}</span>
          </div>

          <div className="flex items-center justify-around py-2 flex-wrap gap-4">
            {/* SVG Donut */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#B5451B"
                  strokeWidth="14"
                  strokeDasharray="107 238"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#22331E"
                  strokeWidth="14"
                  strokeDasharray="71 238"
                  strokeDashoffset="-107"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#E8B84B"
                  strokeWidth="14"
                  strokeDasharray="36 238"
                  strokeDashoffset="-178"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#8C7355"
                  strokeWidth="14"
                  strokeDasharray="24 238"
                  strokeDashoffset="-214"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-serif font-bold text-base">45%</span>
                <span className="text-[10px] text-[#B5451B] font-medium">{t('craft_pottery_short', 'Pottery')}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs font-sans">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B5451B]" />
                <span className="font-medium">{t('craft_pottery_short', 'Pottery')} (45%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22331E] dark:bg-[#344E41]" />
                <span className="font-medium">{t('craft_weaving_short', 'Weaving')} (30%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8B84B]" />
                <span className="font-medium">{t('craft_woodwork_short', 'Woodwork')} (15%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8C7355]" />
                <span className="font-medium">{t('craft_brass_short', 'Brass')} (10%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Revenue Trend Waveform */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border shadow-xs space-y-4 ${
            isDark
              ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
              : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
          }`}
        >
          <div className="flex justify-between items-center">
            <h4 className="font-serif font-bold text-sm sm:text-base flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-[#22331E] dark:text-[#E8B84B]">
                show_chart
              </span>
              {t('daily_sales_volume', 'Daily Sales Volume')}
            </h4>
            <span className="text-xs text-[#B5451B] font-bold">
              {t('peak_on_weekends', 'Peak on Weekends')}
            </span>
          </div>

          <div className="h-28 w-full relative pt-2">
            <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible">
              <path
                d="M 10 65 Q 40 20, 80 50 T 160 30 T 240 15 T 290 25 L 290 80 L 10 80 Z"
                fill="rgba(181, 69, 27, 0.15)"
              />
              <path
                d="M 10 65 Q 40 20, 80 50 T 160 30 T 240 15 T 290 25"
                fill="none"
                stroke="#B5451B"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="flex justify-between text-xs opacity-60 font-sans font-medium">
            <span>{t('day_mon', 'Mon')}</span>
            <span>{t('day_wed', 'Wed')}</span>
            <span>{t('day_fri', 'Fri')}</span>
            <span>{t('day_sun', 'Sun')}</span>
          </div>
        </div>
      </div>

      {/* Workshop Inventory & Stock Tracker Section */}
      <div id="inventory-manager-section" className="space-y-4 pt-2">
        {/* Toast alert on quick restock */}
        {restockedItemTitle && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-[#22331E] text-white rounded-2xl flex items-center justify-between shadow-lg border border-[#E8B84B]/40"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E8B84B]">inventory</span>
              <span className="text-xs font-sans font-medium">
                {t('restocked_success', 'Stock replenished successfully for')}: <strong>{restockedItemTitle}</strong> (+5 units)
              </span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">SAVED</span>
          </motion.div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3
              className={`font-serif font-bold text-lg sm:text-xl flex items-center gap-2 ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
              }`}
            >
              <span className="material-symbols-outlined text-2xl text-[#B5451B]">inventory_2</span>
              {t('workshop_inventory_title', 'Workshop Inventory & Stock Tracker')}
            </h3>
            <p className="text-xs opacity-70 font-sans mt-0.5">
              {t('workshop_inventory_sub', 'Live inventory stock counts, low-stock alerts, and quick replenishment')}
            </p>
          </div>

          {/* Quick Search & Summary Badge */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-50">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_craft_inventory', 'Filter crafts...')}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs font-sans border outline-none transition-all w-36 sm:w-48 ${
                  isDark
                    ? 'bg-[#1C221A] border-[#2D3A2B] text-white focus:border-[#E8B84B]'
                    : 'bg-[#EFE4CF] border-[#22331E]/20 text-[#1A1815] focus:border-[#B5451B]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Inventory Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => {
              sound.playTap();
              setInventoryFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-serif font-bold whitespace-nowrap transition-all cursor-pointer ${
              inventoryFilter === 'all'
                ? 'bg-[#22331E] text-white shadow-xs'
                : isDark
                ? 'bg-[#1C221A] text-[#F4ECDE]/70 border border-[#2D3A2B]'
                : 'bg-[#EFE4CF] text-[#22331E]/70 border border-[#22331E]/10'
            }`}
          >
            {t('all_crafts', 'All Inventory')} ({currentProducts.length})
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setInventoryFilter('low');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-serif font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              inventoryFilter === 'low'
                ? 'bg-[#B5451B] text-white shadow-xs'
                : isDark
                ? 'bg-[#1C221A] text-[#B5451B] border border-[#B5451B]/40'
                : 'bg-[#FFF5F2] text-[#B5451B] border border-[#B5451B]/30'
            }`}
          >
            <span className="material-symbols-outlined text-xs">warning</span>
            <span>{t('low_stock_filter', 'Low Stock Alerts')} ({lowStockProducts.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setInventoryFilter('healthy');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-serif font-bold whitespace-nowrap transition-all cursor-pointer ${
              inventoryFilter === 'healthy'
                ? 'bg-[#2D6A4F] text-white shadow-xs'
                : isDark
                ? 'bg-[#1C221A] text-[#88C498] border border-[#2D3A2B]'
                : 'bg-[#EFE4CF] text-[#22331E]/70 border border-[#22331E]/10'
            }`}
          >
            {t('healthy_stock_filter', 'Healthy Stock')} ({healthyProducts.length})
          </button>
        </div>

        {/* Product Inventory Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const isCritical = prod.stock <= 2;
            const isLow = prod.stock <= lowStockThreshold;

            return (
              <div
                key={prod.id}
                id={`inventory-card-${prod.id}`}
                className={`rounded-3xl p-4 border flex flex-col justify-between gap-3 shadow-md transition-all ${
                  isCritical
                    ? 'border-[#B5451B] ring-2 ring-[#B5451B]/30 bg-[#251512] text-[#F4ECDE]'
                    : isLow
                    ? 'border-[#D9A441] ring-1 ring-[#D9A441]/40 bg-[#241A14] text-[#F4ECDE]'
                    : isDark
                    ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                    : 'bg-[#241A14] border-white/10 text-[#F4ECDE]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={prod.polishedImageUrl || prod.rawImageUrl}
                    alt={prod.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80';
                    }}
                    className="w-16 h-16 rounded-2xl object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#FFA680]">
                        {prod.category}
                      </span>
                      {isCritical ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-[#B5451B] text-white flex items-center gap-1 shadow-xs animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {t('critical_stock', 'Critical Low')}
                        </span>
                      ) : isLow ? (
                        <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-[#E8B84B] text-[#1A1815] shadow-xs">
                          {t('low_stock', 'Low Stock')}
                        </span>
                      ) : (
                        <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-[#22331E] text-[#88C498] border border-[#88C498]/30">
                          {t('in_stock', 'In Stock')}
                        </span>
                      )}
                    </div>
                    <h5 className="font-serif font-bold text-sm truncate mt-1 text-[#F4ECDE]">
                      {prod.title}
                    </h5>
                    <p className="text-xs text-[#F4ECDE]/80 font-sans mt-0.5">
                      ₹{(prod.price ?? 0).toLocaleString('en-IN')} / unit
                    </p>
                  </div>
                </div>

                {/* Stock Controls & Actions */}
                <div className="pt-2.5 border-t border-white/15 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStockChange(prod.id, prod.stock ?? 0, -1)}
                      disabled={(prod.stock ?? 0) <= 0}
                      title="Reduce stock by 1"
                      className="w-7 h-7 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-[#F4ECDE] flex items-center justify-center font-bold text-sm disabled:opacity-30 active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <div className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/15 text-center min-w-[56px]">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isCritical
                            ? 'text-[#FFA680]'
                            : isLow
                            ? 'text-[#E8B84B]'
                            : 'text-[#88C498]'
                        }`}
                      >
                        {prod.stock ?? 0}
                      </span>
                      <span className="text-[9px] block text-[#F4ECDE]/75 font-medium leading-none mt-0.5">units</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStockChange(prod.id, prod.stock ?? 0, 1)}
                      title="Increase stock by 1"
                      className="w-7 h-7 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 text-[#F4ECDE] flex items-center justify-center font-bold text-sm active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Restock Batch Action Button */}
                  <button
                    type="button"
                    onClick={() => handleStockChange(prod.id, prod.stock ?? 0, 5)}
                    className="px-3 py-1.5 rounded-xl bg-[#22331E] hover:bg-[#162313] text-[#F4ECDE] border border-[#88C498]/40 text-xs font-serif font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-xs text-[#E8B84B]">add_circle</span>
                    <span className="text-[#F4ECDE]">+5 {t('restock', 'Restock')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Customer Orders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4
            className={`font-serif font-bold text-base sm:text-lg flex items-center gap-2 ${
              isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
            }`}
          >
            <span className="material-symbols-outlined text-xl text-[#B5451B]">local_shipping</span>
            {t('customer_orders_dispatch', 'Customer Orders to Dispatch')}
          </h4>
          <span className="text-xs sm:text-sm text-[#B5451B] font-sans font-bold">
            {orders.filter((o) => o.status !== 'shipped').length} {t('pending_label', 'Pending')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className={`rounded-3xl p-4 sm:p-5 border flex flex-col justify-between gap-3 shadow-xs min-w-0 overflow-hidden ${
                isDark
                  ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                  : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={ord.itemImage}
                  alt={ord.itemTitle}
                  className="w-14 h-14 rounded-2xl object-cover border border-black/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-bold text-[#B5451B] font-sans truncate">
                      {ord.orderNumber}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 whitespace-nowrap ${
                        ord.status === 'shipped'
                          ? 'bg-[#22331E] text-white'
                          : 'bg-[#B5451B] text-white'
                      }`}
                    >
                      {ord.status === 'shipped' ? t('dispatched', 'Dispatched') : t('pending', 'Pending')}
                    </span>
                  </div>
                  <h5 className="font-serif font-bold text-sm truncate mt-0.5">
                    {ord.itemTitle}
                  </h5>
                  <p className="text-xs opacity-70 font-sans truncate">
                    {ord.customerName} • {ord.location}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#22331E]/10 flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm">₹{(ord.amount ?? 1250).toLocaleString('en-IN')}</span>
                {ord.status !== 'shipped' ? (
                  <button
                    onClick={() => handleFulfill(ord.id)}
                    className="bg-[#22331E] text-white text-xs font-serif font-bold px-3.5 py-2 rounded-xl shadow-xs hover:bg-[#1A2817] active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-sm">mark_email_read</span>
                    <span>{t('mark_dispatched', 'Dispatch')}</span>
                  </button>
                ) : (
                  <span className="text-xs text-[#22331E] dark:text-[#88C498] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {t('dispatched', 'Dispatched')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title={t('waybill_generated_title', 'Waybill & Shipping Label Generated!')}
        subtitle={t('waybill_generated_sub', 'The parcel status has been updated to Shipped with courier tracking assigned.')}
        actionLabel={t('done', 'Done')}
        onAction={() => setShowSuccess(false)}
        isDark={isDark}
      />
    </div>
  );
};
