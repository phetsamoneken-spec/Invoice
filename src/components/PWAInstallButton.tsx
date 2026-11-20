import React, { useState } from 'react';
import { CheckCircle2, Download, Share2, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="inline-flex items-center gap-2 text-xs font-medium text-[#008C35]">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>ຕິດຕັ້ງແອັບແລ້ວ (Installed PWA)</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#008C35] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00732B] active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{compact ? 'ຕິດຕັ້ງແອັບ' : 'ຕິດຕັ້ງໃສ່ໜ້າຈໍ (Install App)'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#008C35]/30 bg-[#EAF8EE] px-4 py-2 text-sm font-medium text-[#008C35] transition hover:bg-[#d9f3e1] active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        <span>{compact ? 'ວິທີຕິດຕັ້ງ' : isIOS ? 'ຕິດຕັ້ງເທິງ iOS' : 'ວິທີຕິດຕັ້ງ PWA'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="w-full max-w-sm rounded-[20px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 id="pwa-install-guide-title" className="text-base font-bold text-[#17241C]">
                {isIOS ? 'ຕິດຕັ້ງແອັບເທິງ iPhone / iPad' : 'ຕິດຕັ້ງແອັບໃສ່ໜ້າຈໍຫຼັກ'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#17241C]/60 hover:bg-[#F7FAF8]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-3 space-y-2 text-sm text-[#17241C]/80">
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-[#008C35]">1.</span>
                  <span>
                    ກົດປຸ່ມ <Share2 className="inline h-4 w-4 text-[#008C35]" /> <strong>Share</strong> ໃນ Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-[#008C35]">2.</span>
                  <span>
                    ເລືອກ <strong>Add to Home Screen</strong> (ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ).
                  </span>
                </li>
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[#17241C]/80">
                ເປີດເມນູຂອງບຣາວເຊີ Chrome / Edge (⋮) ແລ້ວເລືອກ{' '}
                <strong>Install app</strong> ຫຼື <strong>Add to Home screen</strong> ເພື່ອໃຊ້ງານແບບ Offline.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-[#008C35] py-2.5 text-sm font-semibold text-white hover:bg-[#00732B]"
            >
              ເຂົ້າໃຈແລ້ວ
            </button>
          </div>
        </div>
      )}
    </>
  );
};
