import { useEffect, useState } from 'react';
// import { Upload, Trash2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Upload, Trash2, GripVertical, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useAdBanners } from '../../hooks/useAdBanners';
import { useCategoryVisibility } from '../../hooks/useCategoryVisibility';
import { useAuditLog } from '../../hooks/useAuditLog';
import LogoCropModal from '../../components/shared/LogoCropModal';
import Sk from '../../components/shared/Skeleton';
import './AdManagementPage.css';

// Matches Home + CategoryActionsPage.jsx's CATEGORY_ACTIONS keys — one ad
// slot per page. Simplified v0, see docs/AdBanners-Plan.md: no dates, no
// pricing tiers, just whatever image/link is currently live per placement.
const PLACEMENTS = [
  { id: 'home',         label: 'Home' },
  { id: 'restaurants',  label: 'Restaurants' },
  { id: 'travel',       label: 'Travel' },
  { id: 'healthcare',   label: 'HealthCare' },
  { id: 'salon',        label: 'Salon & Personal Care' },
  { id: 'wedding',      label: 'Wedding' },
  { id: 'education',    label: 'Education' },
  { id: 'entertainment', label: 'Entertainment' },
  // Not a category — the ad slot on FindBusinessPage.jsx (/find-business).
  { id: 'findbusiness', label: 'Find Business' },
];

// Placements that are a page's banner slot, not a home-page category —
// never reorderable/hideable.
const STANDALONE_IDS = ['home', 'findbusiness'];

const AD_ASPECT = 1600 / 534;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // stricter than storage.rules' 5MB ceiling — keeps ad images light

// Order/hide only ever applies to the actual home-page categories — "Home"
// itself is the banner-strip slot, not a hideable/reorderable category.
const CATEGORY_PLACEMENTS = PLACEMENTS.filter(p => !STANDALONE_IDS.includes(p.id));
const HOME_PLACEMENT = PLACEMENTS.find(p => p.id === 'home');
const FIND_PLACEMENT = PLACEMENTS.find(p => p.id === 'findbusiness');

// Ad Carousel (2026-11-17) — rotating multi-image slot under the form on
// /find-business (components/public/AdCarousel.jsx). Kept out of PLACEMENTS:
// it stores a `slides` array, not a single imageUrl.
const CAROUSEL_PLACEMENT = { id: 'findbusinessCarousel', label: 'Ad Carousel — Find Business' };
const CAROUSEL_ASPECT = 4 / 3;
const MAX_CAROUSEL_SLIDES = 5;

export default function AdManagementPage() {
  const { user } = useAuth();
  // const { banners, loading, fetchAll, saveImage, saveLink, removeImage } = useAdBanners();
  const {
    banners, loading, fetchAll, saveImage, saveLink, removeImage,
    addCarouselSlide, removeCarouselSlide, saveCarouselSlides,
  } = useAdBanners();
  const { order, hidden, saveOrder, toggleHidden } = useCategoryVisibility();
  const { log } = useAuditLog();

  const [linkDrafts, setLinkDrafts] = useState({});
  const [cropTarget, setCropTarget] = useState(null); // { placementId, imageSrc }
  const [saving, setSaving] = useState(null); // placementId currently saving
  const [dragId, setDragId] = useState(null);
  const [slideLinkDrafts, setSlideLinkDrafts] = useState([]); // Ad Carousel per-slide link inputs
  const [newSlideLink, setNewSlideLink] = useState('');

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // A category missing from `order` (new in code, never dragged yet) is
  // appended at the end rather than dropped — same rule HomePageV2.jsx
  // uses to decide render order.
  const orderedCategories = [
    ...order.map(id => CATEGORY_PLACEMENTS.find(p => p.id === id)).filter(Boolean),
    ...CATEGORY_PLACEMENTS.filter(p => !order.includes(p.id)),
  ];
  const displayPlacements = [HOME_PLACEMENT, FIND_PLACEMENT, ...orderedCategories];

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const ids = orderedCategories.map(p => p.id);
    const from = ids.indexOf(dragId);
    ids.splice(from, 1);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    saveOrder(ids);
    setDragId(null);
  };

  // Touch-friendly fallback — native HTML5 drag-drop doesn't fire from
  // touch gestures on mobile/tablet (iOS Safari has no support at all,
  // Android Chrome is inconsistent), so this is the only way to reorder
  // from a phone/tablet. Desktop keeps drag-drop too, both write the
  // same order array.
  const moveCategory = (id, direction) => {
    const ids = orderedCategories.map(p => p.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    saveOrder(ids);
  };

  useEffect(() => {
    const drafts = {};
    PLACEMENTS.forEach(({ id }) => { drafts[id] = banners[id]?.linkUrl || ''; });
    setLinkDrafts(drafts);
  }, [banners]);

  const carouselSlides = banners[CAROUSEL_PLACEMENT.id]?.slides || [];

  useEffect(() => {
    setSlideLinkDrafts((banners[CAROUSEL_PLACEMENT.id]?.slides || []).map(s => s.linkUrl || ''));
  }, [banners]);

  const handleFileChange = (placementId, e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropTarget({ placementId, imageSrc: reader.result });
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (blob) => {
    const { placementId } = cropTarget;
    if (placementId === CAROUSEL_PLACEMENT.id) return handleCarouselCropSave(blob);
    setSaving(placementId);
    try {
      await saveImage(placementId, blob, linkDrafts[placementId], user.uid);
      await log({ action: 'update', targetCollection: 'adBanners', docId: placementId, summary: `Ad banner — ${placementId}` });
      toast.success('Ad banner updated.');
      setCropTarget(null);
    } catch {
      toast.error('Could not upload ad banner. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (placementId, label) => {
    if (!window.confirm(`Remove the ad on "${label}"? It'll go back to "Place your Ad here" until a new one is set.`)) return;
    setSaving(placementId);
    try {
      await removeImage(placementId);
      await log({ action: 'delete', targetCollection: 'adBanners', docId: placementId, summary: `Ad banner — ${placementId}` });
      toast.success('Ad banner removed.');
    } catch {
      toast.error('Could not remove ad banner. Try again.');
    } finally {
      setSaving(null);
    }
  };

  // ── Ad Carousel handlers ──
  const handleCarouselFile = (e) => {
    if (carouselSlides.length >= MAX_CAROUSEL_SLIDES) {
      e.target.value = '';
      toast.error(`Max ${MAX_CAROUSEL_SLIDES} ads in the carousel — remove one first.`);
      return;
    }
    handleFileChange(CAROUSEL_PLACEMENT.id, e);
  };

  const handleCarouselCropSave = async (blob) => {
    const id = CAROUSEL_PLACEMENT.id;
    setSaving(id);
    try {
      await addCarouselSlide(id, blob, newSlideLink, user.uid);
      await log({ action: 'update', targetCollection: 'adBanners', docId: id, summary: 'Ad carousel — slide added' });
      toast.success('Ad added to carousel.');
      setNewSlideLink('');
      setCropTarget(null);
    } catch {
      toast.error('Could not upload ad. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleCarouselRemove = async (index) => {
    if (!window.confirm(`Remove ad #${index + 1} from the carousel?`)) return;
    const id = CAROUSEL_PLACEMENT.id;
    setSaving(id);
    try {
      await removeCarouselSlide(id, index, user.uid);
      await log({ action: 'delete', targetCollection: 'adBanners', docId: id, summary: `Ad carousel — slide ${index + 1} removed` });
      toast.success('Ad removed.');
    } catch {
      toast.error('Could not remove ad. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleCarouselMove = async (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= carouselSlides.length) return;
    const next = [...carouselSlides];
    [next[index], next[to]] = [next[to], next[index]];
    setSaving(CAROUSEL_PLACEMENT.id);
    try {
      await saveCarouselSlides(CAROUSEL_PLACEMENT.id, next, user.uid);
    } catch {
      toast.error('Could not reorder. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleCarouselLinkSave = async (index) => {
    if ((slideLinkDrafts[index] || '') === (carouselSlides[index]?.linkUrl || '')) return; // unchanged
    const next = carouselSlides.map((s, i) => (i === index ? { ...s, linkUrl: slideLinkDrafts[index] || '' } : s));
    setSaving(CAROUSEL_PLACEMENT.id);
    try {
      await saveCarouselSlides(CAROUSEL_PLACEMENT.id, next, user.uid);
      toast.success('Link updated.');
    } catch {
      toast.error('Could not save link. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleLinkSave = async (placementId) => {
    const existing = banners[placementId];
    if (!existing?.imageUrl) return; // nothing to attach a link to yet
    if (linkDrafts[placementId] === (existing.linkUrl || '')) return; // unchanged
    if (!window.confirm('Update the link for this ad?')) return;
    setSaving(placementId);
    try {
      await saveLink(placementId, linkDrafts[placementId]);
      toast.success('Link updated.');
    } catch {
      toast.error('Could not save link. Try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Ad Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {/* One ad slot per page — upload an image, crop it, add a link. Changes go live immediately. */}
            One ad slot per page — upload an image, crop it, add a link. Changes go live immediately.
            {' '}<strong>3:1 ratio — recommended 1600 × 534 px</strong> (min 1200 × 400 px, max 1MB).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="adm-grid">
          {PLACEMENTS.map(p => <Sk key={p.id} h="220px" r="var(--radius)" />)}
        </div>
      ) : (
        <div className="adm-grid">
          {displayPlacements.map(({ id, label }) => {
            const b = banners[id];
            const isCategory = !STANDALONE_IDS.includes(id);
            const isHidden = isCategory && hidden.includes(id);
            const catIndex = isCategory ? orderedCategories.findIndex(p => p.id === id) : -1;
            return (
              <div
                className={`card adm-card ${dragId === id ? 'adm-card-dragging' : ''} ${isHidden ? 'adm-card-hidden' : ''}`}
                key={id}
                draggable={isCategory}
                onDragStart={isCategory ? () => setDragId(id) : undefined}
                onDragOver={isCategory ? (e) => e.preventDefault() : undefined}
                onDrop={isCategory ? () => handleDrop(id) : undefined}
              >
                <div className="card-body">
                  <div className="adm-card-header">
                    {isCategory && <GripVertical size={16} className="adm-drag-handle" />}
                    {isCategory && (
                      <div className="adm-move-btns">
                        <button type="button" className="adm-move-btn" onClick={() => moveCategory(id, -1)} disabled={catIndex === 0} title="Move up">
                          <ArrowUp size={13} />
                        </button>
                        <button type="button" className="adm-move-btn" onClick={() => moveCategory(id, 1)} disabled={catIndex === orderedCategories.length - 1} title="Move down">
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    )}
                    <h3 className="adm-card-title">{label}</h3>
                    {isCategory && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!isHidden}
                        className={`toggle-switch ${!isHidden ? 'on' : ''}`}
                        onClick={() => toggleHidden(id)}
                        title={isHidden ? 'Hidden from home page — click to show' : 'Shown on home page — click to hide'}
                      >
                        <span className="toggle-switch-knob" />
                      </button>
                    )}
                  </div>

                  <div className="adm-preview">
                    {b?.imageUrl
                      ? <img src={b.imageUrl} alt="" />
                      : <span className="adm-preview-empty">No ad set</span>}
                  </div>

                  <div className="adm-upload-row">
                    <label className="btn btn-ghost btn-sm adm-upload-btn">
                      <Upload size={14} /> {b?.imageUrl ? 'Change Image' : 'Browse Image'}
                      <input type="file" accept="image/*" hidden onChange={e => handleFileChange(id, e)} disabled={saving === id} />
                    </label>
                    {b?.imageUrl && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemove(id, label)}
                        disabled={saving === id}
                        title="Remove ad"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="form-group adm-link-group">
                    <label className="form-label">Link URL (optional)</label>
                    <div className="adm-link-row">
                      <input
                        className="form-control"
                        placeholder="https://... or /qunjeeats/business/..."
                        value={linkDrafts[id] || ''}
                        onChange={e => setLinkDrafts(d => ({ ...d, [id]: e.target.value }))}
                        disabled={saving === id}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleLinkSave(id)}
                        disabled={saving === id || !b?.imageUrl}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ad Carousel (2026-11-17) — rotating ads under the form on /find-business ── */}
      {!loading && (
        <div className="card adm-carousel-card">
          <div className="card-body">
            <div className="adm-card-header">
              <h3 className="adm-card-title">{CAROUSEL_PLACEMENT.label}</h3>
              <span className="adm-carousel-count">{carouselSlides.length}/{MAX_CAROUSEL_SLIDES}</span>
            </div>
            <p className="adm-carousel-hint">
              {/* Up to {MAX_CAROUSEL_SLIDES} ads, auto-rotating every 4s (swipe on mobile). Shown below the Submit button on /find-business. 4:3 crop. */}
              Up to {MAX_CAROUSEL_SLIDES} ads, auto-rotating every 4s (swipe on mobile). Shown below the Submit button on /find-business.
              {' '}<strong>4:3 ratio — recommended 1200 × 900 px</strong> (min 800 × 600 px, max 1MB).
            </p>

            <div className="adm-carousel-grid">
              {carouselSlides.map((s, i) => (
                <div className="adm-carousel-slide" key={s.imageUrl}>
                  <div className="adm-preview adm-preview--carousel">
                    <img src={s.imageUrl} alt="" />
                  </div>
                  <div className="adm-upload-row">
                    <span className="adm-carousel-num">#{i + 1}</span>
                    <button type="button" className="adm-move-btn" onClick={() => handleCarouselMove(i, -1)} disabled={i === 0 || saving === CAROUSEL_PLACEMENT.id} title="Move left">
                      <ArrowLeft size={13} />
                    </button>
                    <button type="button" className="adm-move-btn" onClick={() => handleCarouselMove(i, 1)} disabled={i === carouselSlides.length - 1 || saving === CAROUSEL_PLACEMENT.id} title="Move right">
                      <ArrowRight size={13} />
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleCarouselRemove(i)} disabled={saving === CAROUSEL_PLACEMENT.id} title="Remove ad">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="adm-link-row">
                    <input
                      className="form-control"
                      placeholder="Link (optional)"
                      value={slideLinkDrafts[i] || ''}
                      onChange={e => setSlideLinkDrafts(d => { const n = [...d]; n[i] = e.target.value; return n; })}
                      disabled={saving === CAROUSEL_PLACEMENT.id}
                    />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCarouselLinkSave(i)} disabled={saving === CAROUSEL_PLACEMENT.id}>
                      Save
                    </button>
                  </div>
                </div>
              ))}

              {carouselSlides.length < MAX_CAROUSEL_SLIDES && (
                <div className="adm-carousel-slide">
                  <div className="adm-preview adm-preview--carousel">
                    <span className="adm-preview-empty">New ad</span>
                  </div>
                  <div className="adm-link-row">
                    <input
                      className="form-control"
                      placeholder="Link for new ad (optional)"
                      value={newSlideLink}
                      onChange={e => setNewSlideLink(e.target.value)}
                      disabled={saving === CAROUSEL_PLACEMENT.id}
                    />
                  </div>
                  <label className="btn btn-ghost btn-sm adm-upload-btn">
                    <Upload size={14} /> {saving === CAROUSEL_PLACEMENT.id ? 'Saving…' : 'Add Image'}
                    <input type="file" accept="image/*" hidden onChange={handleCarouselFile} disabled={saving === CAROUSEL_PLACEMENT.id} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cropTarget && (
        <LogoCropModal
          imageSrc={cropTarget.imageSrc}
          /* aspect={AD_ASPECT} */
          aspect={cropTarget.placementId === CAROUSEL_PLACEMENT.id ? CAROUSEL_ASPECT : AD_ASPECT}
          mimeType="image/webp"
          /* title={`Crop Ad — ${PLACEMENTS.find(p => p.id === cropTarget.placementId)?.label}`} */
          title={`Crop Ad — ${(cropTarget.placementId === CAROUSEL_PLACEMENT.id ? CAROUSEL_PLACEMENT : PLACEMENTS.find(p => p.id === cropTarget.placementId))?.label}`}
          saveLabel="Save Ad"
          onCancel={() => setCropTarget(null)}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
