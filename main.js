// Mobile menu toggle
const header = document.querySelector('header');
const hamb = document.querySelector('.hamb');
if (hamb) {
  hamb.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    hamb.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Reduced motion preference
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Smooth scroll with custom easing (disabled if prefers-reduced-motion)
function easeInOutQuad(t){ return t<0.5 ? 2*t*t : -1 + (4 - 2*t)*t; }
function smoothScrollTo(targetY, duration=700){
  if (prefersReduced) { window.scrollTo(0, targetY); return; }
  const startY = window.pageYOffset;
  const diff = targetY - startY;
  let start;
  function step(ts){
    if(!start) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    const eased = easeInOutQuad(t);
    window.scrollTo(0, startY + diff * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Anchor links
const headerOffset = 70;
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (el){
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      smoothScrollTo(y, 750);
      header.classList.remove('open');
      if (hamb) hamb.setAttribute('aria-expanded','false');
    }
  });
});

// Reveal on scroll (disabled if reduced motion)
const reveals = document.querySelectorAll('.reveal');
if (prefersReduced){
  reveals.forEach(el => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    });
  }, {threshold:.12});
  reveals.forEach(el=> io.observe(el));
}

/* Hero image parallax (scroll-based). Respects prefers-reduced-motion. */
(() => {
  if (prefersReduced) return;
  const heroImg = document.querySelector('.hero-media img');
  if (!heroImg) return;
  let ticking = false;
  function onScroll(){
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const rect = heroImg.getBoundingClientRect();
      const winH = window.innerHeight;
      // compute how far the image is from center of viewport
      const centerDist = (rect.top + rect.height/2) - (winH/2);
  // map to small translate range (tunable via CSS variables)
  const root = getComputedStyle(document.documentElement);
  const max = parseFloat(root.getPropertyValue('--parallax-hero-max')) || 22; // px
  const factor = 0.06; // sensitivity
  const translate = Math.max(-max, Math.min(max, -centerDist * factor));
  heroImg.style.transform = `translateY(${translate}px)`;
      ticking = false;
    });
  }
  // initial
  onScroll();
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);
})();

/* desktop mousemove parallax and hero entrance animation */
(() => {
  if (prefersReduced) return;
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero-media img');
  if (!hero) return;

  // Detect touch — skip mousemove parallax on touch devices
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Hero entrance: split heading words into spans and stagger
  const h = document.querySelector('.h1');
  if (h){
    const words = h.textContent.trim().split(/\s+/);
    h.innerHTML = words.map((w, i) => `<span class="h1-word" style="--i:${i}">${w}&nbsp;</span>`).join('');
    // trigger animation slightly after load
    requestAnimationFrame(()=> setTimeout(()=> h.classList.add('h1-animate'), 120));
  }

  if (isTouch) return; // no mousemove parallax on touch
  // background subtle parallax: move the body:after via CSS variables (tunable)
  const root = getComputedStyle(document.documentElement);
  const mouseMax = parseFloat(root.getPropertyValue('--parallax-mouse-max')) || 12;
  const bgDist = parseFloat(root.getPropertyValue('--bg-float-distance')) || 18;

  // enable animated background only for large desktops
  const shouldAnimateBg = (window.innerWidth >= 1200 && !isTouch && !prefersReduced && window.devicePixelRatio >= 1);
  if (shouldAnimateBg) document.documentElement.classList.add('bg-animate');

  let mx = 0, my = 0;
  function onMove(e){
    const x = (e.clientX / window.innerWidth) - 0.5;
    const y = (e.clientY / window.innerHeight) - 0.5;
    mx = x; my = y;
    // hero image translate (mousemove intensity tuned with --parallax-mouse-max)
    if (heroImg){
      const tx = Math.round(mx * mouseMax);
      const ty = Math.round(my * mouseMax);
      heroImg.style.transform = `translateY(${ty}px) translateX(${tx}px)`;
    }
    // subtle background movement (body:after) using CSS variable distance
    document.body.style.setProperty('--bg-offset-x', `${mx * bgDist}px`);
    document.body.style.setProperty('--bg-offset-y', `${my * bgDist}px`);
  }
  const handler = (e) => requestAnimationFrame(()=> onMove(e));
  window.addEventListener('mousemove', handler, {passive:true});
})();

// Simple email form (demo only)
const form = document.getElementById('interestForm');
const msg = document.getElementById('formMsg');
if (form){
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = (document.getElementById('email').value || '').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      msg.textContent = 'Please enter a valid email.';
      msg.style.color = '#b91c1c';
      return;
    }
    // Replace with your real endpoint call
    msg.textContent = `Thanks! We'll send the itinerary, fees, and travel info to ${email}.`;
    msg.style.color = 'var(--muted)';
    form.reset();
  });
}

// Copy phrase button
const copyBtn = document.getElementById('copyPhrase');
if (copyBtn){
  copyBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText("I'm in");
      msg.textContent = 'Copied “I’m in” to clipboard. Paste it into your reply/email.';
      msg.style.color = 'var(--muted)';
    }catch(err){
      msg.textContent = 'Copy not available. Please type “I’m in”.';
      msg.style.color = 'var(--muted)';
    }
  });
}

/* Zoom toggle removed — viewport controlled by meta tag */

/* Gallery lightbox */
(() => {
  const galleryImgs = Array.from(document.querySelectorAll('.gallery img'));
  if (!galleryImgs.length) return;

  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox && lightbox.querySelector('.lb-img');
  const lbCaption = lightbox && lightbox.querySelector('.lb-caption');
  const lbSpinner = lightbox && lightbox.querySelector('.lb-spinner');
  const btnPrev = lightbox && lightbox.querySelector('.lb-prev');
  const btnNext = lightbox && lightbox.querySelector('.lb-next');
  const btnClose = lightbox && lightbox.querySelector('.lb-close');
  let current = 0;

  let lastActive = null;

  function openLightbox(idx){
    idx = Math.max(0, Math.min(galleryImgs.length - 1, idx));
    current = idx;
    const thumb = galleryImgs[current];
    if (!thumb) return;

    // save focus to restore later
    lastActive = document.activeElement;

    const full = thumb.dataset.full || thumb.src;

    // show loading state by clearing src then setting when loaded
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden','false');
    lightbox.setAttribute('aria-busy','true');
    document.body.style.overflow = 'hidden';
    lbImg.src = '';
    if (lbSpinner) lbSpinner.classList.add('visible');
    // load image then set
    const imgLoader = new Image();
    imgLoader.onload = () => {
      lbImg.src = imgLoader.src;
      lbImg.alt = thumb.alt || '';
      const counter = lightbox.querySelector('.lb-counter');
      if (counter) counter.textContent = `${current + 1} of ${galleryImgs.length}`;
      // move focus into the lightbox (close button)
      const focusable = getFocusable(lightbox);
      if (focusable.length) focusable[0].focus();
      if (lbSpinner) lbSpinner.classList.remove('visible');
      lightbox.removeAttribute('aria-busy');
    };
    imgLoader.onerror = () => {
      // fallback to thumb
      lbImg.src = thumb.src;
      lbImg.alt = thumb.alt || '';
      lbCaption.textContent = thumb.alt || '';
      if (lbSpinner) lbSpinner.classList.remove('visible');
      lightbox.removeAttribute('aria-busy');
    };
    imgLoader.src = full;
    trapFocus(true);
  }

  function closeLightbox(){
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    trapFocus(false);
    // clear image to release memory on some mobile browsers
    setTimeout(()=> lbImg.src = '', 250);
    // restore focus
    if (lastActive && typeof lastActive.focus === 'function') lastActive.focus();
  }

  function showNext(delta){
    current = (current + delta + galleryImgs.length) % galleryImgs.length;
    const thumb = galleryImgs[current];
    const full = (thumb && (thumb.dataset.full || thumb.src)) || '';
    lbImg.src = '';
    const imgLoader = new Image();
    imgLoader.onload = () => {
      lbImg.src = imgLoader.src;
      lbImg.alt = thumb.alt || '';
      const counter = lightbox.querySelector('.lb-counter');
      if (counter) counter.textContent = `${current + 1} of ${galleryImgs.length}`;
      if (lbSpinner) lbSpinner.classList.remove('visible');
      lightbox.removeAttribute('aria-busy');
    };
    imgLoader.onerror = () => { lbImg.src = thumb.src; };
    imgLoader.src = full;
    if (lbSpinner) lbSpinner.classList.add('visible');
  }

  // utility: focusable elements inside container
  function getFocusable(container){
    if (!container) return [];
    return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }

  // simple focus trap
  let trap = false;
  function trapFocus(enable){
    trap = !!enable;
    if (!enable) return;
    // ensure focus is inside
    const focusable = getFocusable(lightbox);
    if (focusable.length) focusable[0].focus();
  }

  // click handlers for thumbnails
  galleryImgs.forEach((img, i) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLightbox(i));
    img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openLightbox(i); });
  });

  // controls
  if (btnPrev) btnPrev.addEventListener('click', () => showNext(-1));
  if (btnNext) btnNext.addEventListener('click', () => showNext(1));
  if (btnClose) btnClose.addEventListener('click', closeLightbox);

  // close when clicking outside the image
  if (lightbox){
    lightbox.addEventListener('click', (e)=>{
      if (e.target === lightbox) closeLightbox();
    });
  }

  // keyboard navigation + focus trap handling
  document.addEventListener('keydown', (e)=>{
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') return closeLightbox();
    if (e.key === 'ArrowLeft') return showNext(-1);
    if (e.key === 'ArrowRight') return showNext(1);

    if (e.key === 'Tab' && trap){
      const focusable = getFocusable(lightbox);
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey){ // backward
        if (document.activeElement === first){ last.focus(); e.preventDefault(); }
      } else { // forward
        if (document.activeElement === last){ first.focus(); e.preventDefault(); }
      }
    }
  });
})();
