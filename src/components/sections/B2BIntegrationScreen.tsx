import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BulkInquiry, ScreenId, LanguageCode } from '../../types';
import { BULK_INQUIRIES } from '../../data/mockData';
import { sound } from '../../services/sound';
import { SuccessModal } from '../common/SuccessModal';
import { PrintableCraftQRCodeModal } from '../common/PrintableCraftQRCodeModal';
import { useTranslation } from '../../services/translations';

interface B2BScreenProps {
  onNavigate: (screen: ScreenId) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

export const B2BIntegrationScreen: React.FC<B2BScreenProps> = ({
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [inquiries, setInquiries] = useState<BulkInquiry[]>(BULK_INQUIRIES);
  const [selectedInquiry, setSelectedInquiry] = useState<BulkInquiry | null>(null);
  const [qrLabelItem, setQrLabelItem] = useState<BulkInquiry | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [acceptedBuyer, setAcceptedBuyer] = useState<string | null>(null);

  const successTitle = acceptedBuyer
    ? t('bulk_order_confirmed', 'Bulk Order Confirmed!')
    : t('order_accepted', 'Order Accepted!');

  const successSubtitle = acceptedBuyer
    ? `${t('accepted_order_from', 'Accepted procurement order from')} ${acceptedBuyer}. ${t('gem_cert_gen', 'GeM compliance certificate generated.')}`
    : t('po_generated_sub', 'Official purchase order generated. Initial 40% escrow advance initiated.');

  const handleAccept = (id: string, buyerName: string) => {
    sound.playSuccess();
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: 'accepted' } : inq))
    );
    setSelectedInquiry(null);
    setAcceptedBuyer(buyerName);
    setShowSuccess(true);
  };

  const handleDecline = (id: string) => {
    sound.playTap();
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: 'declined' } : inq))
    );
    setSelectedInquiry(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Animated Bridge Metaphor Card */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden ${
          isDark
            ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
            : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
        }`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8B84B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E8B84B]/20 border border-[#E8B84B]/40 text-[#FFEBB3] text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm text-[#E8B84B]">verified</span>
              {t('gem_govt_vendor', 'GeM Government Portal Verified')}
            </span>
            <span className="text-xs font-bold bg-[#E8B84B]/20 text-[#E8B84B] px-3 py-1 rounded-full border border-[#E8B84B]/30">
              {t('live_synced', 'Live & Synced')}
            </span>
          </div>

          <div className="max-w-3xl">
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">
              {t('shilpsetu_bridge', 'ShilpSetu Institutional Bridge')}
            </h3>
            <p className="text-xs sm:text-sm text-white/75 font-sans mt-1.5 leading-relaxed">
              {t(
                'bridge_desc',
                'Connecting rural master artisans directly to government procurement (GeM), corporate gifting, and luxury export houses.'
              )}
            </p>
          </div>

          {/* Flowing Animated Bridge Visual */}
          <div className="pt-3 flex items-center justify-between relative max-w-2xl mx-auto px-4 sm:px-8">
            {/* Left: Artisan Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl bg-[#B5451B] text-white flex items-center justify-center shadow-lg border border-[#E8B84B]/50">
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <span className="text-xs font-sans font-bold text-[#E8B84B]">
                {t('artisan_role', 'Artisan')}
              </span>
            </div>

            {/* Center: Animated Flowing Bridge Dots */}
            <div className="flex-1 mx-4 sm:mx-8 relative flex items-center justify-center">
              <div className="w-full h-0.5 bg-[#E8B84B]/30" />
              <div className="absolute flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ x: [0, 60, 0], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    className="w-2.5 h-2.5 rounded-full bg-[#E8B84B] shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* Right: GeM & Buyers Node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-2xl bg-[#22331E] border border-[#E8B84B]/50 text-white flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <span className="text-xs font-sans font-bold text-[#FFEBB3]">
                {t('gem_buyers', 'GeM & Buyers')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pipeline & Institutional Info */}
        <div className="lg:col-span-5 space-y-5">
          {/* Vertical Verification & Sync Stepper */}
          <div
            className={`rounded-3xl p-6 border shadow-xs space-y-4 ${
              isDark
                ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
            }`}
          >
            <h4 className="font-serif font-bold text-base sm:text-lg">
              {t('onboarding_pipeline', 'Onboarding & Verification Pipeline')}
            </h4>

            <div className="space-y-3.5">
              {/* Step 1: Udyam */}
              <div
                className={`flex items-start gap-3.5 p-4 rounded-2xl border ${
                  isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#22331E] text-[#F4ECDE] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">check</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h5 className="font-serif font-bold text-xs sm:text-sm">{t('udyam_reg', 'Udyam Registration')}</h5>
                    <span className="text-[10px] font-bold text-[#2E4638] dark:text-[#88C498]">
                      {t('verified_tag', 'Verified')}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 font-sans mt-0.5">
                    UDYAM-UP-75-0029418 {t('registered_under_msme', 'registered under MSME Ministry.')}
                  </p>
                </div>
              </div>

              {/* Step 2: Catalog Sync */}
              <div
                className={`flex items-start gap-3.5 p-4 rounded-2xl border ${
                  isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#22331E] text-[#F4ECDE] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">check</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h5 className="font-serif font-bold text-xs sm:text-sm">{t('gem_catalog_sync', 'GeM Catalog Synchronization')}</h5>
                    <span className="text-[10px] font-bold text-[#2E4638] dark:text-[#88C498]">
                      4 {t('items_live', 'Items Live')}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 font-sans mt-0.5">
                    HSN 6912.00 • {t('hsn_compliant_desc', 'Compliant with auto-generated tax invoices.')}
                  </p>
                </div>
              </div>

              {/* Step 3: Direct Escrow Settlement */}
              <div
                className={`flex items-start gap-3.5 p-4 rounded-2xl border ${
                  isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#E8B84B] text-[#1A1815] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">lock</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h5 className="font-serif font-bold text-xs sm:text-sm">{t('direct_escrow', 'Direct DBT / Bank Escrow')}</h5>
                    <span className="text-[10px] font-bold text-[#B5451B]">
                      {t('active_tag', 'Active')}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 font-sans mt-0.5">
                    {t('sbi_branch_escrow', 'State Bank of India (Varanasi Branch)')} • {t('ready_for_advance', 'Ready for 40% advances.')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Highlights Card */}
          <div
            className={`rounded-3xl p-5 border text-xs space-y-2.5 ${
              isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#EAE0CC] border-[#22331E]/10 text-[#1A1815]'
            }`}
          >
            <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#B5451B]">
              <span className="material-symbols-outlined text-lg">gavel</span>
              <span>{t('procurement_act_title', 'Public Procurement Act 2012')}</span>
            </div>
            <p className="opacity-80 font-sans leading-relaxed">
              {t('procurement_act_desc', 'Under Indian Public Procurement Policy, Central Ministries and PSUs have a mandatory 25% annual procurement target from certified MSMEs, with special quotas reserved for traditional handicraft artisans.')}
            </p>
          </div>
        </div>

        {/* Right Column: Bulk Inquiries Feed */}
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4
                className={`font-serif font-bold text-base sm:text-lg flex items-center gap-2 ${
                  isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
                }`}
              >
                <span className="material-symbols-outlined text-xl text-[#B5451B]">inventory_2</span>
                {t('direct_bulk_inquiries', 'Direct Bulk & Tender Inquiries')}
              </h4>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="reset-mock-inquiries-btn"
                  onClick={() => {
                    sound.playTap();
                    setInquiries(BULK_INQUIRIES);
                  }}
                  className="text-xs font-sans text-[#B5451B] dark:text-[#E8B84B] hover:underline cursor-pointer flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                  title="Reset to default mock inquiries"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>{t('reset_mock_data', 'Reset Mock Data')}</span>
                </button>
                <span className="text-xs text-[#B5451B] font-sans font-bold bg-[#B5451B]/10 px-2.5 py-1 rounded-full">
                  {inquiries.filter((i) => i.status === 'pending').length} {t('active_tag', 'Active')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {inquiries.map((inq) => {
                const isPending = inq.status === 'pending';
                const isAccepted = inq.status === 'accepted';
                const totalValue = inq.quantity * inq.targetPrice;

                return (
                  <motion.div
                    key={inq.id}
                    layout
                    className={`rounded-3xl p-5 border shadow-xs space-y-3.5 ${
                      isDark
                        ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]'
                        : 'bg-[#EFE4CF] border-[#22331E]/10 text-[#1A1815]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#B5451B] bg-white/70 dark:bg-black/40 px-2.5 py-0.5 rounded-full border border-black/10">
                          {inq.buyerType}
                        </span>
                        <h5 className="font-serif font-bold text-base mt-1.5">{inq.buyerName}</h5>
                        <p className="text-xs opacity-70 font-sans">
                          {inq.location} • {t('required_by', 'Required by')} {inq.requiredBy}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isAccepted
                            ? 'bg-[#22331E] text-white'
                            : inq.status === 'declined'
                            ? 'bg-red-800 text-white'
                            : 'bg-[#E8B84B] text-[#1A1815]'
                        }`}
                      >
                        {t(inq.status, inq.status)}
                      </span>
                    </div>

                    {/* Details Banner */}
                    <div
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#121411] border-[#2D3A2B]' : 'bg-white border-[#22331E]/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={inq.imageUrl}
                          alt={inq.itemTitle}
                          className="w-13 h-13 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-serif font-bold text-sm line-clamp-1">{inq.itemTitle}</p>
                          <p className="text-xs opacity-70 font-sans mt-0.5">
                            {t('qty', 'Qty')}: <strong>{inq.quantity} {t('units', 'units')}</strong> @ ₹{inq.targetPrice}/{t('per_unit', 'unit')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-[#B5451B] font-bold block uppercase tracking-wider">
                          {t('total_value', 'Total Value')}
                        </span>
                        <span className="font-serif font-bold text-base sm:text-lg">
                          ₹{totalValue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <p
                      className={`text-xs italic p-3 rounded-2xl border ${
                        isDark
                          ? 'bg-[#121411] text-[#F4ECDE]/80 border-[#2D3A2B]'
                          : 'bg-[#F4ECDE] text-[#22331E]/80 border-[#22331E]/10'
                      }`}
                    >
                      "{inq.notes}"
                    </p>

                    {isPending && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleDecline(inq.id)}
                          className={`flex-1 border font-medium py-3 rounded-2xl text-xs active:scale-95 transition-all shadow-xs ${
                            isDark
                              ? 'bg-[#121411] border-[#2D3A2B] text-[#F4ECDE]/70 hover:bg-[#222720]'
                              : 'bg-white border-[#22331E]/15 text-[#22331E]/70 hover:bg-[#FAF4E8]'
                          }`}
                        >
                          {t('decline', 'Decline')}
                        </button>

                        <button
                          onClick={() => {
                            sound.playTap();
                            setSelectedInquiry(inq);
                          }}
                          className="flex-1 bg-[#22331E] text-white font-serif font-bold py-3 rounded-2xl text-xs shadow-xs hover:bg-[#1A2817] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">handshake</span>
                          <span>{t('review_accept', 'Review & Accept')}</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`rounded-3xl p-6 max-w-sm w-full border shadow-2xl space-y-4 ${
                isDark
                  ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
                  : 'bg-[#F5EFE3] text-[#1A1815] border-[#D9A441]'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-black/10">
                <h4 className="font-serif font-bold text-base">
                  {t('confirm_bulk_order', 'Confirm Bulk Procurement')}
                </h4>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="space-y-2 text-xs opacity-80">
                <p>
                  <strong>{t('buyer_label', 'Buyer')}:</strong> {selectedInquiry.buyerName} (
                  {selectedInquiry.buyerType})
                </p>
                <p>
                  <strong>{t('item_label', 'Item')}:</strong> {selectedInquiry.itemTitle}
                </p>
                <p>
                  <strong>{t('quantity_label', 'Quantity')}:</strong> {selectedInquiry.quantity} {t('units', 'Units')}
                </p>
                <p>
                  <strong>{t('total_escrow_value', 'Total Escrow Value')}:</strong> ₹
                  {(selectedInquiry.quantity * selectedInquiry.targetPrice).toLocaleString('en-IN')}
                </p>
                <div
                  className={`p-3.5 rounded-2xl text-[11px] space-y-1 border ${
                    isDark
                      ? 'bg-[#121411] border-[#2D3A2B]'
                      : 'bg-[#EFE4CF] border-[#22331E]/10'
                  }`}
                >
                  <p className="font-bold text-[#88C498]">
                    ✓ 40% {t('advance_credited', 'Advance')} (₹
                    {(
                      selectedInquiry.quantity *
                      selectedInquiry.targetPrice *
                      0.4
                    ).toLocaleString('en-IN')}
                    ) {t('credited_on_confirm', 'credited upon confirmation.')}
                  </p>
                  <p className="text-[#B5451B] font-medium">
                    ✓ {t('gem_waybill_generated', 'Shipping labels & GeM waybill automatically generated.')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="flex-1 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 py-3 rounded-2xl text-xs font-serif font-bold transition-colors active:scale-95"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => handleAccept(selectedInquiry.id, selectedInquiry.buyerName)}
                  className="flex-1 bg-[#22331E] text-white py-3 rounded-2xl text-xs font-serif font-bold shadow-md hover:bg-[#1A2817]"
                >
                  {t('accept_order', 'Accept Order')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title={successTitle}
        subtitle={successSubtitle}
        actionText={t('view_active_orders', 'View Active Orders')}
        onAction={() => setShowSuccess(false)}
        isDark={isDark}
      />
      {/* Printable Physical Craft Hangtag Modal */}
      {qrLabelItem && (
        <PrintableCraftQRCodeModal
          isOpen={!!qrLabelItem}
          onClose={() => setQrLabelItem(null)}
          craftTitle={qrLabelItem.productTitle}
          category={qrLabelItem.category}
          price={qrLabelItem.unitPrice}
          artisanName="Rameshwar Prasad"
          artisanLocation="Jaipur, Rajasthan"
          materials="Terracotta Clay & River Silt"
          craftId={`b2b-order-${qrLabelItem.id}`}
          isDark={isDark}
        />
      )}
    </div>
  );
};
