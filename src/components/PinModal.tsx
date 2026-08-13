import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-xs p-6 shadow-2xl text-center space-y-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle ? (
              <span>{subtitle}</span>
            ) : (
              <>Enter 4-digit PIN code (Default: <span className="font-bold text-emerald-700">1234</span>)</>
            )}
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center space-x-3 py-1">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-emerald-600 border-emerald-700 scale-125'
                  : 'bg-slate-100 border-slate-300'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-600 font-bold flex items-center justify-center space-x-1 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
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
                className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-base font-bold active:scale-95 transition-all cursor-pointer hover:border-emerald-500/40"
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
