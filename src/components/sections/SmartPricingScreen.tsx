import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ProductItem, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { SuccessModal } from '../common/SuccessModal';
import { useTranslation } from '../../services/translations';

interface SmartPricingProps {
  products: ProductItem[];
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

type DemandLevel = 'low' | 'moderate' | 'high' | 'festive';

export const SmartPricingScreen: React.FC<SmartPricingProps> = ({
  onNavigate,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [hoursWorked, setHoursWorked] = useState<number>(5);
  const [materialCost, setMaterialCost] = useState<number>(140);
  const [demandLevel, setDemandLevel] = useState<DemandLevel>('high');
  const [manualPrice, setManualPrice] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Hourly wage standard for skilled artisan
  const hourlyRate = 180;

  // Multiplier based on demand
  const demandMultipliers: Record<DemandLevel, { factor: number; label: string }> = {
    low: { factor: 1.1, label: t('low_season', 'Low Season') },
    moderate: { factor: 1.25, label: t('standard_demand', 'Standard Demand') },
    high: { factor: 1.45, label: t('high_demand', 'High Demand') },
    festive: { factor: 1.7, label: t('festive_surge', 'Festive Surge 🔥') },
  };

  // Calculated Pricing Values
  const laborCost = hoursWorked * hourlyRate;
  const baseCost = materialCost + laborCost;
  const optimalPrice = Math.round(baseCost * demandMultipliers[demandLevel].factor);
  const minFairPrice = Math.round(baseCost * 1.15);
  const maxSafePrice = Math.round(baseCost * 1.85);

  const displayPrice = manualPrice !== null ? manualPrice : optimalPrice;
  const profitMargin = displayPrice - baseCost;
  const profitPercentage = Math.round((profitMargin / displayPrice) * 100);

  // Gauge Angle Calculation (-90 deg to +90 deg)
  const gaugePercentage = Math.max(
    0,
    Math.min(100, ((displayPrice - minFairPrice) / (maxSafePrice - minFairPrice || 1)) * 100)
  );
  const gaugeAngle = -90 + (gaugePercentage / 100) * 180;

  // 30-Day Simulated Market Trend Points
  useMemo(() => {
    const base = optimalPrice * 0.85;
    return [
      { day: 'Day 1', price: Math.round(base * 0.95) },
      { day: 'Day 5', price: Math.round(base * 0.98) },
      { day: 'Day 10', price: Math.round(base * 1.02) },
      { day: 'Day 15', price: Math.round(base * 1.05) },
      { day: 'Day 20', price: Math.round(base * 1.12) },
      { day: 'Day 25', price: Math.round(base * 1.16) },
      { day: 'Today', price: optimalPrice },
    ];
  }, [optimalPrice]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header Card */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-artisan ${
          isDark
            ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
            : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#E8B84B] text-xl">verified_user</span>
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-[#E8B84B]">
            {t('screen_pricing', 'Ethical Craft Pricing Engine')}
          </span>
        </div>
        <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">
          {t('pricing_hero_title', 'Honor Your Hands. Value Your Time.')}
        </h3>
        <p className="text-xs sm:text-sm text-white/80 font-sans mt-1.5 leading-relaxed max-w-3xl">
          {t(
            'pricing_hero_desc',
            'Protects artisans from under-pricing by factoring in pure material costs, skilled hourly labor, and real-time market demand.'
          )}
        </p>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Big Circular Price Gauge & Apply Action */}
        <div className="lg:col-span-6 space-y-5">
          {/* Big Circular Price Gauge Card */}
          <div
            className={`rounded-3xl p-6 sm:p-7 border shadow-xs text-center relative overflow-hidden ${
              isDark
                ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
            }`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-[#E8B84B]/10 blur-xl pointer-events-none" />

            <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#B5451B] font-bold block mb-1">
              {t('calculated_fair_price', 'AI Suggested Fair Price')}
            </span>

            {/* Circular SVG Semi-Gauge */}
            <div className="relative w-52 h-32 mx-auto flex items-end justify-center overflow-hidden">
              <svg viewBox="0 0 200 110" className="w-full h-full">
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={isDark ? '#2D3A2B' : '#DDC0B8'}
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth="16"
                  strokeDasharray="251"
                  strokeDashoffset={251 - (gaugePercentage / 100) * 251}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22331E" />
                    <stop offset="50%" stopColor="#E8B84B" />
                    <stop offset="100%" stopColor="#B5451B" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Needle Indicator */}
              <div
                className="absolute bottom-2 left-1/2 origin-bottom transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-50%) rotate(${gaugeAngle}deg)` }}
              >
                <div className="w-1.5 h-22 bg-[#1A1815] dark:bg-white rounded-t-full shadow-md relative">
                  <div className="w-4 h-4 rounded-full bg-[#B5451B] border-2 border-white absolute -bottom-2 -left-1.5" />
                </div>
              </div>
            </div>

            {/* Main Price Number */}
            <div className="mt-3">
              <motion.h2
                key={displayPrice}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-serif font-bold text-4xl sm:text-5xl text-[#B5451B] tracking-tight"
              >
                ₹{displayPrice.toLocaleString('en-IN')}
              </motion.h2>
              <p
                className={`text-xs sm:text-sm font-semibold mt-1 ${
                  isDark ? 'text-[#88C498]' : 'text-[#22331E]'
                }`}
              >
                +₹{profitMargin} {t('artisan_profit_est', 'estimated artisan profit')} ({profitPercentage}%)
              </p>
            </div>

            {/* Profit Breakdown Stacked Bar */}
            <div className="mt-6 space-y-2 text-left">
              <div className="flex justify-between text-xs font-medium opacity-75">
                <span>{t('cost_breakdown', 'Cost Breakdown')}</span>
                <span className="font-bold">
                  {t('total_value', 'Total Value')}: ₹{displayPrice}
                </span>
              </div>

              <div className="w-full h-4 rounded-full overflow-hidden bg-black/10 flex">
                <div
                  className="bg-[#89726B] h-full"
                  style={{ width: `${(materialCost / displayPrice) * 100}%` }}
                  title={`Material Cost: ₹${materialCost}`}
                />
                <div
                  className="bg-[#22331E] dark:bg-[#344E41] h-full"
                  style={{ width: `${(laborCost / displayPrice) * 100}%` }}
                  title={`Artisan Labor: ₹${laborCost}`}
                />
                <div
                  className="bg-[#E8B84B] h-full"
                  style={{ width: `${Math.max(0, (profitMargin / displayPrice) * 100)}%` }}
                  title={`Profit Margin: ₹${profitMargin}`}
                />
              </div>

              <div className="flex justify-between text-[11px] font-sans pt-1 font-medium flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#89726B]" /> {t('materials_label', 'Materials')} (₹{materialCost})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22331E] dark:bg-[#344E41]" /> {t('labor_label', 'Labor')} (₹{laborCost})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E8B84B]" /> {t('margin_label', 'Margin')} (₹{profitMargin})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Parameter Controls */}
        <div className="lg:col-span-6 space-y-5">
          <div
            className={`rounded-3xl p-6 sm:p-7 border shadow-xs space-y-5 ${
              isDark
                ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-base sm:text-lg">
                {t('adjust_parameters', 'Adjust Craft Parameters')}
              </h4>
            </div>

            {/* 1. Hours Worked Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#B5451B]">schedule</span>
                  {t('time_dedicated', 'Time Dedicated (Hours)')}
                </span>
                <span className="font-serif font-bold text-sm sm:text-base text-[#B5451B]">
                  {hoursWorked} hrs (@ ₹{hourlyRate}/hr)
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="30"
                value={hoursWorked}
                onChange={(e) => {
                  setHoursWorked(Number(e.target.value));
                  setManualPrice(null);
                  sound.playTick();
                }}
                className="w-full accent-[#B5451B] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] opacity-65 font-sans">
                <span>1 hr ({t('quick_craft', 'Quick pottery')})</span>
                <span>15 hrs</span>
                <span>30 hrs ({t('masterpiece', 'Masterpiece')})</span>
              </div>
            </div>

            {/* 2. Material Cost Stepper */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#B5451B]">shopping_cart</span>
                  {t('raw_material_expenses', 'Raw Material Expenses')}
                </span>
                <span className="font-serif font-bold text-sm sm:text-base">₹{materialCost}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sound.playTap();
                    setMaterialCost(Math.max(20, materialCost - 50));
                    setManualPrice(null);
                  }}
                  className={`w-11 h-11 rounded-2xl border font-bold text-xl flex items-center justify-center active:scale-95 shadow-xs transition-colors ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white hover:bg-[#222720]'
                      : 'bg-white border-[#22331E]/15 text-[#1A1815] hover:bg-[#FAF4E8]'
                  }`}
                >
                  -
                </button>

                <div
                  className={`flex-1 border rounded-2xl py-2.5 px-4 text-center font-bold text-base font-mono ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white'
                      : 'bg-white border-[#22331E]/15 text-[#1A1815]'
                  }`}
                >
                  ₹{materialCost}
                </div>

                <button
                  onClick={() => {
                    sound.playTap();
                    setMaterialCost(materialCost + 50);
                    setManualPrice(null);
                  }}
                  className={`w-11 h-11 rounded-2xl border font-bold text-xl flex items-center justify-center active:scale-95 shadow-xs transition-colors ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B] text-white hover:bg-[#222720]'
                      : 'bg-white border-[#22331E]/15 text-[#1A1815] hover:bg-[#FAF4E8]'
                  }`}
                >
                  +
                </button>
              </div>
            </div>

            {/* 3. Demand Level Segmented Control */}
            <div className="space-y-2.5">
              <label className="text-xs sm:text-sm font-semibold block">
                {t('market_demand_level', 'Market & Festive Demand')}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['low', 'moderate', 'high', 'festive'] as DemandLevel[]).map((lvl) => {
                  const isSelected = demandLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        sound.playTap();
                        setDemandLevel(lvl);
                        setManualPrice(null);
                      }}
                      className={`py-2.5 px-3.5 rounded-2xl text-xs sm:text-sm font-sans font-medium transition-all ${
                        isSelected
                          ? 'bg-[#B5451B] text-white font-bold shadow-xs'
                          : isDark
                          ? 'bg-[#121411] border border-[#2D3A2B] text-[#F4ECDE] hover:bg-[#222720]'
                          : 'bg-white border border-[#22331E]/15 text-[#1A1815] hover:bg-[#FAF4E8]'
                      }`}
                    >
                      {demandMultipliers[lvl].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Apply to Catalog Button directly below Adjust Craft Parameters box */}
          <button
            onClick={() => {
              sound.playTap();
              setShowSuccess(true);
            }}
            className="w-full bg-[#B5451B] hover:bg-[#9E3913] text-white font-serif font-bold text-base py-4 rounded-3xl shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">price_check</span>
            <span>
              {t('apply_price_to_catalog', 'Apply')} ₹{displayPrice.toLocaleString('en-IN')} {t('to_catalog', 'to Catalog')}
            </span>
          </button>

          {/* Ethical Artisan Pricing Charter */}
          <div
            className={`p-4 sm:p-5 rounded-3xl border text-xs space-y-2 ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-white/60 border-[#22331E]/10 text-[#22331E]'
            }`}
          >
            <div className="flex items-center gap-2 text-[#B5451B] font-serif font-bold">
              <span className="material-symbols-outlined text-base">handshake</span>
              <span>Fair Wage Standard Transparency</span>
            </div>
            <p className="text-[11px] sm:text-xs opacity-80 leading-relaxed font-sans">
              Unlike industrial retail algorithms that squeeze handmade producers, ShilpSetu enforces a minimum floor wage of ₹180/hour for traditional master artisans, protecting generational craft lineage.
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        onAction={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        title={t('price_applied_success', 'Price Applied to Catalog!')}
        subtitle={`${t('price_applied_sub', 'Your craft is now listed at')} ₹${displayPrice.toLocaleString(
          'en-IN'
        )}, ${t('fair_margin_secured', 'securing a fair margin for your labor.')}`}
        actionLabel={t('continue_to_b2b_gem', 'Continue to B2B & GeM')}
        actionText={t('continue_to_b2b_gem', 'Continue to B2B & GeM')}
        isDark={isDark}
      />
    </div>
  );
};
