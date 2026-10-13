import { useEffect, useRef } from 'react';
import { ExternalLink, X } from 'lucide-react';
import './video-player.css';

export function VideoPlayer({ open, title, videoId, videoUrl, onClose }: {
  open: boolean;
  title: string;
  videoId?: string;
  videoUrl?: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="lt-video-dialog"
      aria-label={`Watch ${title}`}
      onCancel={onClose}
      onClose={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="lt-video-panel">
        <div className="lt-video-top">
          <span className="lt-video-title">{title}</span>
          <button type="button" className="lt-video-close" onClick={onClose} aria-label="Close video and return to carousel"><X size={24} /></button>
        </div>
        {open && videoId ? (
          <div className="lt-video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&playsinline=1`}
              title={`YouTube video: ${title}`}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="lt-video-empty">No verified video has been added for this selection yet.</p>
        )}
        <p className="lt-video-note">Press Play in the YouTube player. Playback does not guarantee a counted YouTube view.</p>
        {videoUrl && <a className="lt-video-fallback" href={videoUrl} target="_blank" rel="noopener noreferrer">Can't play here? Open on YouTube <ExternalLink size={15} /></a>}
      </div>
    </dialog>
  );
}
