import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onSuccess: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  correctPin,
  onSuccess,
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center space-y-5">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-slate-100">
            Owner Security Check
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Enter 4-digit PIN code (Default: <span className="font-bold text-blue-400">1234</span>)
          </p>
        </div>

        {/* PIN Indicators Dots */}
        <div className="flex justify-center items-center space-x-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-blue-500 border-blue-400 scale-110 shadow-lg shadow-blue-500/50'
                  : 'bg-slate-950 border-slate-700'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-semibold flex items-center justify-center space-x-1 animate-pulse">
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
                className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-100 text-base font-bold active:scale-95 transition-transform"
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
