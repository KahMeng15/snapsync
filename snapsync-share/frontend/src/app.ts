import { formatDateTime } from './dateFormat';

const basePath = '/snapsync';

interface SessionPhoto {
  id: string
  url: string
  thumbnail: string | null
  size: number
  frameId?: string
  frameName?: string
  downloadUrl?: string
  isOriginal?: boolean
}

interface SessionData {
  sessionId: string
  photoCount: number
  frameName: string | null
  createdAt: string
  expiresAt?: string | null
  photos: SessionPhoto[]
  organizer?: string
  contactInfo?: string
  eventName?: string
  shareTitle?: string | null
}

const $ = (id: string) => document.getElementById(id)!;
const $$ = (sel: string) => document.querySelectorAll(sel);

let sessionData: SessionData | null = null;
let currentPhotoIdx = 0;
let animationPhotos: SessionPhoto[] = [];
let heroInterval: number | null = null;
let heroIndex = 0;

async function init() {
  const parts = window.location.pathname.split('/');
  let token = parts.pop();
  if (!token) token = parts.pop(); // handle trailing slash

  if (!token) {
    $('loader').classList.add('hidden');
    $('error').classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${basePath}/api/share/${token}`);
    const data = await res.json();

    $('loader').classList.add('hidden');

    if (data.expired) {
      $('expired').classList.remove('hidden');
      return;
    }

    if (data.error) {
      $('error').classList.remove('hidden');
      return;
    }

    sessionData = data;
    render(token);

    // Analytics ping
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('ref') === 'qr' ? 'qr' : 'direct';
    fetch(`${basePath}/api/share/${token}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    }).catch(() => {});
  } catch (err) {
    console.error(err);
    $('loader').classList.add('hidden');
    $('error').classList.remove('hidden');
  }
}

function render(token: string) {
  $('content').classList.remove('hidden');
  $('footer').classList.remove('hidden');

  if (sessionData!.shareTitle) {
    $('share-title').textContent = sessionData!.shareTitle;
  }
  $('event-name').textContent = sessionData!.eventName || 'snapsync';
  
  if (sessionData!.organizer) {
    if (sessionData!.contactInfo) {
      const link = $('contact-link');
      link.textContent = sessionData!.organizer;
      link.classList.remove('hidden');
      link.onclick = (e) => { e.preventDefault(); $('contact-modal').classList.add('active'); };
      $('contact-info-text').textContent = sessionData!.contactInfo;
    } else {
      $('organizer-text').textContent = sessionData!.organizer;
    }
  }

  if (heroInterval) {
    window.clearInterval(heroInterval);
    heroInterval = null;
  }
  heroIndex = 0;

  // Rotate through original photos only (no framed images)
  animationPhotos = sessionData!.photos.filter(
    (p) => p.isOriginal === true || (!p.frameId && p.frameName === 'Original Photos') || p.frameId === 'unframed'
  );

  if (animationPhotos.length >= 2) {
    $('content').classList.add('has-hero');
    $('hero-preview').classList.remove('hidden');
    updateHero();
    heroInterval = window.setInterval(() => {
      heroIndex = (heroIndex + 1) % animationPhotos.length;
      updateHero();
    }, 500);
  } else {
    $('content').classList.remove('has-hero');
    $('hero-preview').classList.add('hidden');
  }

  const container = $('photos-container');
  container.innerHTML = '';

  const totalPhotos = sessionData!.photos.length;
  if (totalPhotos <= 1) {
    document.body.classList.add('single-photo-mode');
    $('share-page')?.classList.add('single-photo-mode');
    $('content')?.classList.add('single-photo-mode');
    container.classList.add('has-single-photo');
    $('download-all-btn').classList.add('hidden');
  } else {
    document.body.classList.remove('single-photo-mode');
    $('share-page')?.classList.remove('single-photo-mode');
    $('content')?.classList.remove('single-photo-mode');
    container.classList.remove('has-single-photo');
    $('download-all-btn').classList.remove('hidden');
  }

  const isOriginal = (p: SessionPhoto) =>
    p.isOriginal === true || (!p.frameId && p.frameName === 'Original Photos') || p.frameId === 'unframed';

  const framedPhotos: { photo: SessionPhoto; globalIdx: number }[] = [];
  const originalPhotos: { photo: SessionPhoto; globalIdx: number }[] = [];

  sessionData!.photos.forEach((photo, i) => {
    if (isOriginal(photo)) {
      originalPhotos.push({ photo, globalIdx: i });
    } else {
      framedPhotos.push({ photo, globalIdx: i });
    }
  });

  const createPhotoCard = (photo: SessionPhoto, globalIdx: number, isSingle = false) => {
    const thumbUrl = photo.thumbnail || photo.url;
    
    const card = document.createElement('div');
    card.className = isSingle ? 'photo-card is-single' : 'photo-card';
    
    const imgWrap = document.createElement('div');
    imgWrap.className = 'card-img-wrap';
    imgWrap.onclick = () => openLightbox(globalIdx);

    const blur = document.createElement('div');
    blur.className = 'blur-bg';
    blur.style.backgroundImage = `url(${thumbUrl})`;
    imgWrap.appendChild(blur);

    if (photo.thumbnail) {
      const thumb = document.createElement('img');
      thumb.src = thumbUrl;
      thumb.className = 'card-thumb';
      thumb.setAttribute('aria-hidden', 'true');
      imgWrap.appendChild(thumb);
    }
    
    const img = document.createElement('img');
    img.src = photo.url;
    img.className = 'share-img';
    img.loading = 'lazy';
    img.onload = () => {
      img.classList.add('loaded');
      const thumb = imgWrap.querySelector('.card-thumb');
      if (thumb) thumb.classList.add('thumb-hidden');
    };
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
      const thumb = imgWrap.querySelector('.card-thumb');
      if (thumb) thumb.classList.add('thumb-hidden');
    }

    imgWrap.appendChild(img);
    card.appendChild(imgWrap);

    const btn = document.createElement('a');
    btn.className = 'download-btn';
    btn.download = '';
    const dlUrl = photo.downloadUrl || '#';
    const sep = dlUrl.includes('?') ? '&' : '?';
    btn.href = dlUrl + sep + 'download=1';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download JPEG`;
    card.appendChild(btn);

    return card;
  };

  const createSection = (title: string, items: { photo: SessionPhoto; globalIdx: number }[], showTitle = true) => {
    if (items.length === 0) return;

    const isSingle = items.length === 1;
    const section = document.createElement('section');
    section.className = isSingle ? 'photo-section single-item-section' : 'photo-section';

    if (showTitle) {
      const header = document.createElement('div');
      header.className = 'section-header';

      const titleEl = document.createElement('h2');
      titleEl.className = 'section-title';
      titleEl.textContent = title;

      header.appendChild(titleEl);
      section.appendChild(header);
    }

    const grid = document.createElement('div');
    grid.className = isSingle ? 'photo-grid single-item' : 'photo-grid';

    items.forEach(({ photo, globalIdx }) => {
      grid.appendChild(createPhotoCard(photo, globalIdx, isSingle));
    });

    section.appendChild(grid);
    container.appendChild(section);
  };

  const showSectionTitles = originalPhotos.length > 0 && framedPhotos.length > 0;

  createSection('Framed Photos', framedPhotos, showSectionTitles);
  createSection('Original Photos', originalPhotos, showSectionTitles);

  if (sessionData!.expiresAt) {
    $('expiry-text').textContent = `Link expires on ${formatDateTime(sessionData!.expiresAt)}`;
  }

  $('download-all-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = `${basePath}/api/share/${token}/download-all`;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
}

function updateHero() {
  const p = animationPhotos[heroIndex];
  if (!p) return;
  const url = p.thumbnail || p.url;
  $('hero-blur').style.backgroundImage = `url(${url})`;
  $('hero-img').setAttribute('src', url);
}

function openLightbox(idx: number) {
  currentPhotoIdx = idx;
  $('lightbox').classList.add('active');
  updateLightbox();
}

function updateLightbox() {
  const p = sessionData!.photos[currentPhotoIdx];
  const thumbUrl = p.thumbnail || p.url;
  
  $('lb-blur').style.backgroundImage = `url(${thumbUrl})`;
  
  const thumb = $('lb-thumb') as HTMLImageElement;
  thumb.src = thumbUrl;
  thumb.classList.remove('thumb-hidden');

  const img = $('lb-img') as HTMLImageElement;
  img.classList.remove('lb-loaded');
  img.onload = () => {
    img.classList.add('lb-loaded');
    thumb.classList.add('thumb-hidden');
  };
  img.src = p.url;
  if (img.complete && img.naturalWidth > 0) {
    img.classList.add('lb-loaded');
    thumb.classList.add('thumb-hidden');
  }

  $('lb-prev').style.display = currentPhotoIdx > 0 ? 'block' : 'none';
  $('lb-next').style.display = currentPhotoIdx < sessionData!.photos.length - 1 ? 'block' : 'none';
}

$('lb-close').onclick = () => $('lightbox').classList.remove('active');
$('modal-close').onclick = () => $('contact-modal').classList.remove('active');
$('lb-prev').onclick = (e) => { e.stopPropagation(); if (currentPhotoIdx > 0) { currentPhotoIdx--; updateLightbox(); } };
$('lb-next').onclick = (e) => { e.stopPropagation(); if (currentPhotoIdx < sessionData!.photos.length - 1) { currentPhotoIdx++; updateLightbox(); } };

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('lightbox').classList.remove('active');
    $('contact-modal').classList.remove('active');
  } else if ($('lightbox').classList.contains('active')) {
    if (e.key === 'ArrowLeft' && currentPhotoIdx > 0) {
      currentPhotoIdx--; updateLightbox();
    } else if (e.key === 'ArrowRight' && currentPhotoIdx < sessionData!.photos.length - 1) {
      currentPhotoIdx++; updateLightbox();
    }
  }
});

init();
