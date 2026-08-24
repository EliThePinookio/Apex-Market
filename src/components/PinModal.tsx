import React, { useState, useEffect } from 'react';
import { Lock, X, KeyRound, AlertCircle, ScanFace, Fingerprint, Loader2 } from 'lucide-react';
import { checkBiometricSupport, authenticateWithBiometrics, BiometricCapability } from '../services/biometricService';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  correctPin,
  onSuccess,
  title = 'Owner Security Check',
  subtitle,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricInfo, setBiometricInfo] = useState<BiometricCapability>({
    isAvailable: false,
    hasEnrolled: false,
    deviceLabel: '',
    isIframeSandbox: false,
  });
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkBiometricSupport().then((info) => {
        setBiometricInfo(info);
      });
    }
  }, [isOpen]);

  const handleBiometricAuth = async () => {
    setIsVerifyingBio(true);
    setErrorMsg('');
    try {
      const res = await authenticateWithBiometrics();
      if (res.success) {
        onSuccess();
        setPinInput('');
        onClose();
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg('Biometric authentication unavailable');
    } finally {
      setIsVerifyingBio(false);
    }
  };

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pinInput.length < 6) {
      const updated = pinInput + digit;
      setPinInput(updated);
      setErrorMsg('');

      if (updated === correctPin) {
        onSuccess();
        setPinInput('');
        onClose();
      } else if (updated.length >= correctPin.length) {
        setErrorMsg('Incorrect PIN! Try default "1234"');
        setTimeout(() => setPinInput(''), 600);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white/90 dark:bg-[#0F172A]/90 border border-white/80 dark:border-white/[0.12] rounded-3xl w-full max-w-xs p-6 shadow-2xl backdrop-blur-2xl text-center space-y-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
          <KeyRound className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            {subtitle ? (
              <span>{subtitle}</span>
            ) : (
              <>Enter 4-digit PIN code (Default: <span className="font-black text-blue-600 dark:text-blue-400">1234</span>)</>
            )}
          </p>
        </div>

        {/* Biometric Quick Unlock (Apple Face ID / Touch ID) */}
        {biometricInfo.isAvailable && (
          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={isVerifyingBio}
            className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 active:scale-[0.97] transition-all cursor-pointer"
          >
            {isVerifyingBio ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Biometrics...</span>
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4 text-white" />
                <span>Unlock with {biometricInfo.deviceLabel || 'Face ID'}</span>
              </>
            )}
          </button>
        )}

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center space-x-3 py-1">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 scale-125 shadow-xs shadow-blue-500/50'
                  : 'bg-black/[0.05] dark:bg-white/[0.08] border-black/[0.1] dark:border-white/[0.15]'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center space-x-1 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}

        {/* Custom Numpad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(
            (btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') setPinInput('');
                  else if (btn === '⌫') handleBackspace();
                  else handleKeyPress(btn);
                }}
                className="py-3 rounded-2xl bg-white/60 dark:bg-[#151D2A]/60 hover:bg-white dark:hover:bg-[#1E293B] border border-white/80 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 text-base font-extrabold active:scale-[0.93] transition-all cursor-pointer shadow-xs"
              >
                {btn}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

