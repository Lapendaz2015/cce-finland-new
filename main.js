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
