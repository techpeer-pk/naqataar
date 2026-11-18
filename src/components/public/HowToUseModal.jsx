import { X } from 'lucide-react';
import './HowToUseModal.css';

// Tutorial video for the "How to use Qunjee" popup on the homepage
// (triggered from HomePageV2.jsx, between cro-card-grid-header and cro-card-grid).
const YOUTUBE_ID = 'MvCxlkINqpc';

export default function HowToUseModal({ onClose }) {
  return (
    <div className="how-to-overlay" onClick={onClose}>
      <div className="how-to-card" onClick={(e) => e.stopPropagation()}>
        <button className="how-to-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {/* <h3 className="how-to-title">How to use Qunjee</h3> */}
        <h3 className="how-to-title">How to use Qufree</h3>
        <div className="how-to-video-wrapper">
          <iframe
            className="how-to-video"
            src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1`}
            /* title="How to use Qunjee" */
            title="How to use Qufree"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <button className="btn btn-primary how-to-done" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
