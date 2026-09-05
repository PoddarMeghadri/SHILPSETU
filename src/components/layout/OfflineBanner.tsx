import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineBannerProps {
  isOffline: boolean;
  onToggleSimulatedOffline?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  onToggleSimulatedOffline,
}) => {
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-[#2E4638] text-[#F5EFE3] text-xs px-4 py-2 flex items-center justify-between z-50 border-b border-[#D9A441]/40"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[#D9A441] animate-pulse">
              cloud_off
            </span>
            <span>
              <strong className="font-serif">Offline Mode:</strong> Showing cached studio & dashboard data.
            </span>
          </div>

          {onToggleSimulatedOffline && (
            <button
              onClick={onToggleSimulatedOffline}
              className="text-[10px] underline uppercase tracking-wider text-[#D9A441] hover:text-white"
            >
              Reconnect
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
