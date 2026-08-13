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
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl w-full max-w-xs p-6 shadow-2xl text-center space-y-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle ? (
              <span>{subtitle}</span>
            ) : (
              <>Enter 4-digit PIN code (Default: <span className="font-bold text-emerald-700 dark:text-emerald-400">1234</span>)</>
            )}
          </p>
        </div>

        {/* Biometric Quick Unlock (Apple Face ID / Touch ID) */}
        {biometricInfo.isAvailable && (
          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={isVerifyingBio}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-950 hover:from-slate-800 hover:to-emerald-900 text-white text-xs font-black shadow-md flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer border border-emerald-500/30"
          >
            {isVerifyingBio ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Verifying Biometrics...</span>
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4 text-emerald-400" />
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
                  ? 'bg-emerald-600 border-emerald-700 dark:bg-emerald-500 dark:border-emerald-400 scale-125'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
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
                className="py-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base font-bold active:scale-95 transition-all cursor-pointer hover:border-emerald-500/40"
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

