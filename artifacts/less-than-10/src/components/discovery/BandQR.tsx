import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X } from 'lucide-react';
import './band-qr.css';

export function BandQR({ bandName, url, open, onClose }: {
  bandName: string; url: string; open: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog ref={dialog} className="lt-qr-dialog" data-testid="dialog-qr"
      aria-labelledby="qr-title" aria-describedby="qr-description"
      onCancel={onClose} onClose={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="lt-qr-content">
        <button type="button" className="lt-qr-close" aria-label="Close QR code" onClick={onClose}><X size={20} /></button>
        <h2 id="qr-title">{bandName}</h2>
        <p id="qr-description">Scan to open this band in the fictional demo.</p>
        {open && <QRCodeCanvas data-testid="qr-code" value={url} size={256} level="M"
          marginSize={4} bgColor="#ffffff" fgColor="#000000" role="img" aria-label={`QR code for ${bandName}`} />}
        <label className="lt-qr-link-label" htmlFor="qr-link">Band-specific demo link</label>
        <input id="qr-link" data-testid="input-qr-link" value={url} readOnly
          onFocus={event => event.currentTarget.select()} onClick={event => event.currentTarget.select()} />
        <p className="lt-qr-note">Select the link to copy manually. QR scans are not tracked.</p>
      </div>
    </dialog>
  );
}
