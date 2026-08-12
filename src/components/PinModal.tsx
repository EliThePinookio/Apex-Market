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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-modal border border-cyan-500/30 rounded-3xl w-full max-w-xs p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-center space-y-5">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <KeyRound className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base font-black text-slate-100">
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {subtitle ? (
              <span>{subtitle}</span>
            ) : (
              <>Enter 4-digit PIN code (Default: <span className="font-extrabold text-cyan-400">1234</span>)</>
            )}
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center space-x-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-cyan-400 border-cyan-300 scale-125 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                  : 'bg-slate-950/80 border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-bold flex items-center justify-center space-x-1 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </p>
        )}

        {/* Custom Numpad */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(
            (btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') setPinInput('');
                  else if (btn === '⌫') handleBackspace();
                  else handleKeyPress(btn);
                }}
                className="py-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 text-slate-100 text-base font-black active:scale-90 transition-all hover:border-cyan-500/30"
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
