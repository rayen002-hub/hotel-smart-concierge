import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeCardProps {
  value: string;
  title: string;
  onClose?: () => void;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ value, title, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      const tempInput = document.createElement('input');
      tempInput.value = value;
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(tempInput);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
      <div className="text-center space-y-1">
        <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">{title}</h3>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Scannez ce code ou copiez le lien</p>
      </div>

      <div className="flex justify-center p-4 bg-white rounded-xl shadow-inner border border-gray-100">
        <QRCodeSVG value={value} size={180} level="H" includeMargin />
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-3 max-h-20 overflow-y-auto">
        <p className="text-[10px] font-mono break-all text-[hsl(var(--muted-foreground))] leading-normal select-all">
          {value}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
            copied
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
          }`}
        >
          {copied ? (
            <>
              <span className="text-sm">✓</span> Copié !
            </>
          ) : (
            <>
              <span className="text-sm">📋</span> Copier
            </>
          )}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-[hsl(var(--border))] text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};
