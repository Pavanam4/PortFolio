/* ═══════════════════════════════════════════════════════════
   PAVAN AM — PREMIUM PORTFOLIO  |  app.js
   Image Sequence Scroll Engine  +  All Site Interactions
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── STATE ──────────────────────────────────────────────── */
const state = {
  mouse: { x: 0, y: 0, nx: 0, ny: 0 },
  cursor: { x: 0, y: 0, tx: 0, ty: 0 },
  trail: { x: 0, y: 0 },
  isMobile: window.innerWidth < 768,
  loaded: false,
  seqReady: false,
};

/* ─── QUERY HELPERS ──────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════════════════
   1.  IMAGE SEQUENCE ENGINE
   Apple-style: canvas full-viewport, frames driven by scroll
═══════════════════════════════════════════════════════════ */
const SEQ = {
  TOTAL: 192,
  PATH: (n) => `assets/frames/${String(n).padStart(5, '0')}.png`,
  images: [],        // HTMLImageElement[]
  canvas: null,
  ctx: null,
  currentFrame: 0,
  targetFrame: 0,
  lerpFactor: 0.12,  // smoothing (0 = no smooth, 1 = instant)
};

function initSequence() {
  SEQ.canvas = $('#seq-canvas');
  SEQ.ctx = SEQ.canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    renderFrame(SEQ.currentFrame);
  });

  // — Pre-load all frames in batches for progress indication
  const loaderBar = $('#seq-loader-bar');
  const loaderPct = $('#seq-loader-pct');
  const loaderDiv = $('#seq-loader');

  let loaded = 0;

  // Create all Image objects at once and track loading
  for (let i = 1; i <= SEQ.TOTAL; i++) {
    const img = new Image();
    img.src = SEQ.PATH(i);
    img.onload = () => {
      loaded++;
      const pct = Math.round((loaded / SEQ.TOTAL) * 100);
      if (loaderBar) loaderBar.style.width = pct + '%';
      if (loaderPct) loaderPct.textContent = pct + '%';

      // Draw first frame as soon as it's ready
      if (loaded === 1) {
        resizeCanvas();
        renderFrame(0);
      }

      if (loaded === SEQ.TOTAL) {
        // All frames loaded — hide loader
        state.seqReady = true;
        setTimeout(() => {
          if (loaderDiv) loaderDiv.classList.add('hidden');
        }, 300);
        // Start render loop
        seqRenderLoop();
      }
    };
    img.onerror = () => { loaded++; }; // skip broken frames
    SEQ.images.push(img);
  }

  // Scroll → frame mapping
  function updateTargetFrame() {
    const container = $('#hero-scroll-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const totalScrollable = container.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const progress = Math.min(scrolled / totalScrollable, 1);
    SEQ.targetFrame = Math.min(
      Math.floor(progress * (SEQ.TOTAL - 1)),
      SEQ.TOTAL - 1
    );
  }

  // Listen to scroll (both wheel and native)
  window.addEventListener('scroll', updateTargetFrame, { passive: true });
}

function resizeCanvas() {
  if (!SEQ.canvas) return;
  SEQ.canvas.width  = window.innerWidth;
  SEQ.canvas.height = window.innerHeight;
}

function renderFrame(index) {
  if (!SEQ.ctx || !SEQ.canvas) return;
  const img = SEQ.images[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cw = SEQ.canvas.width;
  const ch = SEQ.canvas.height;
  const iw = img.naturalWidth  || 1456;
  const ih = img.naturalHeight || 816;

  // Cover-fit: fill canvas without distortion
  const scale = Math.max(cw / iw, ch / ih);
  const sw = iw * scale;
  const sh = ih * scale;
  const sx = (cw - sw) / 2;
  const sy = (ch - sh) / 2;

  SEQ.ctx.clearRect(0, 0, cw, ch);
  SEQ.ctx.drawImage(img, sx, sy, sw, sh);
}

function seqRenderLoop() {
  // Smoothly interpolate currentFrame toward targetFrame
  const diff = SEQ.targetFrame - SEQ.currentFrame;
  if (Math.abs(diff) > 0.01) {
    SEQ.currentFrame += diff * SEQ.lerpFactor;
    const frameIndex = Math.round(SEQ.currentFrame);
    if (frameIndex !== SEQ._lastRendered) {
      renderFrame(frameIndex);
      SEQ._lastRendered = frameIndex;
    }
  }
  requestAnimationFrame(seqRenderLoop);
}

/* ═══════════════════════════════════════════════════════════
   2.  SMOOTH INERTIA SCROLL  (native scroll position based)
      NOTE: Because we use position:sticky for the canvas,
      we use native scroll — the inertia scroll is kept for
      the rest of the page but the sticky hero just uses
      real scrollPosition to drive frames.
═══════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  // Smooth-scroll nav links
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = $(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   3.  LOADER
═══════════════════════════════════════════════════════════ */
function initLoader() {
  const loader = $('#loader');
  // Hide site loader when page assets are ready + a min time
  const MIN = 400;
  const start = Date.now();
  window.addEventListener('load', () => {
    const wait = Math.max(0, MIN - (Date.now() - start));
    setTimeout(() => {
      loader.classList.add('hidden');
      state.loaded = true;
    }, wait);
  });
}

/* ═══════════════════════════════════════════════════════════
   4.  CUSTOM CURSOR
═══════════════════════════════════════════════════════════ */
function initCursor() {
  if (state.isMobile) return;
  const cur = $('#cursor');
  const trail = $('#cursor-trail');

  document.addEventListener('mousemove', e => {
    state.cursor.tx = e.clientX;
    state.cursor.ty = e.clientY;
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.nx = (e.clientX / window.innerWidth)  * 2 - 1;
    state.mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const interactables = 'a, button, .project-card, .skill-block, .contact-btn';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactables)) cur.classList.add('cursor-expand');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactables)) cur.classList.remove('cursor-expand');
  });

  (function animateCursor() {
    state.cursor.x += (state.cursor.tx - state.cursor.x) * 0.9;
    state.cursor.y += (state.cursor.ty - state.cursor.y) * 0.9;
    state.trail.x  += (state.cursor.tx - state.trail.x)  * 0.1;
    state.trail.y  += (state.cursor.ty - state.trail.y)  * 0.1;
    cur.style.left   = state.cursor.x + 'px';
    cur.style.top    = state.cursor.y + 'px';
    trail.style.left = state.trail.x  + 'px';
    trail.style.top  = state.trail.y  + 'px';
    requestAnimationFrame(animateCursor);
  })();
}

/* ═══════════════════════════════════════════════════════════
   5.  PARTICLES  (ambient float + mouse trail)
═══════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = $('#particles-canvas');
  const ctx = canvas.getContext('2d');
  const COUNT = state.isMobile ? 35 : 80;
  let particles  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x     = Math.random() * canvas.width;
      this.y     = init ? Math.random() * canvas.height : canvas.height + 10;
      this.size  = Math.random() * 1.0 + 0.3;
      this.speedY = -(Math.random() * 0.35 + 0.08);
      this.speedX = (Math.random() - 0.5) * 0.15;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.color   = Math.random() > 0.5 ? '#9d4edd' : '#4ecdc4';
      this.life    = 0;
      this.maxLife = Math.random() * 500 + 200;
    }
    update() {
      this.x += this.speedX; this.y += this.speedY; this.life++;
      if (this.y < -10 || this.life > this.maxLife) this.reset();
    }
    draw() {
      const p = this.life / this.maxLife;
      const fade = p < 0.1 ? p * 10 : p > 0.8 ? (1 - p) * 5 : 1;
      ctx.globalAlpha = this.opacity * Math.min(fade, 1);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Secondary Ambient Particle class (Slower, Dimmer, Non-Interactive)
  class Ambient extends Particle {
    reset(init = false) {
      super.reset(init);
      this.speedY = -(Math.random() * 0.15 + 0.08); // Slightly faster
      this.speedX = (Math.random() - 0.5) * 0.12;
      this.opacity = Math.random() * 0.15 + 0.1; // More opaque
      this.size = Math.random() * 1.5 + 0.5;    // Larger
    }
  }

  class Sparkle {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.reset();
    }
    reset() {
      this.x = Math.random() * this.canvas.width;
      this.y = Math.random() * this.canvas.height;
      this.size = Math.random() * 2 + 1;
      this.speedX = (Math.random() - 0.5) * 2;
      this.speedY = (Math.random() - 0.5) * 2;
      this.opacity = 1;
      this.color = Math.random() > 0.5 ? '#9d4edd' : '#4ecdc4';
      this.life = Math.random() * 30 + 20;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity -= 0.03;
      this.life--;
      if (this.life <= 0 || this.opacity <= 0) this.reset();
    }
    draw() {
      this.ctx.globalAlpha = this.opacity;
      this.ctx.fillStyle = this.color;
      this.ctx.beginPath();
      this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  function initSkillMagic() {
    const blocks = document.querySelectorAll('.skill-block');
    const overlay = $('#skill-gallery-overlay');
    const galleryGrid = $('#gallery-grid');
    const galleryTitle = $('#gallery-title');
    const closeBtn = $('#gallery-close');

    const mockData = {
      'Graphic Design': [
        { title: 'Digital Brand Identity', desc: 'Complete visual system for a futuristic fintech startup.' },
        { title: 'Poster Series: Cyber-Nights', desc: 'Award-winning print series exploring neon aesthetics.' },
        { title: 'Minimalist UX Icons', desc: 'Custom vector set designed for a high-end luxury brand.' }
      ],
      'UI/UX Design': [
        { title: 'Neo-Bank Mobile App', desc: 'User interface for a next-gen crypto banking experience.' },
        { title: 'Smart Home Dashboard', desc: 'Integrated control system with glassmorphism UI.' },
        { title: 'E-commerce Redesign', desc: 'Optimized conversion flow for a global fashion retailer.' }
      ],
      'Website Building': [
        { title: 'Interactive Portfolio', desc: 'High-performance WebGL portfolio with smooth transitions.' },
        { title: 'SaaS Multi-Page Site', desc: 'Modern business platform built with optimized code.' },
        { title: 'Creative Agency Page', desc: 'Cinematic brand experience with heavy scroll interactions.' }
      ],
      'Deployment': [
        { title: 'CI/CD Cloud Pipeline', desc: 'Automated deployment system for large-scale enterprise apps.' },
        { title: 'Kubernetes Cluster Setup', desc: 'Scalable infrastructure design for high-traffic platforms.' },
        { title: 'Serverless Edge Functions', desc: 'Optimized global content delivery with sub-second latency.' }
      ],
      '3D Animation': [
        { title: 'Product Vision Reveal', desc: '3D cinematic reveal for a breakthrough tech product.' },
        { title: 'Floating Island World', desc: 'Procedural 3D environment for an interactive VR experience.' },
        { title: 'Motion Graphic Intro', desc: 'Premium logo animation for a high-profile media house.' }
      ],
      'Branding': [
        { title: 'Global Identity System', desc: 'Strategic branding for an international sustainable fashion label.' },
        { title: 'Logo Collection 2024', desc: 'A curated set of 20+ minimalist logos for various industries.' },
        { title: 'Package Design Concept', desc: 'Eco-friendly luxury packaging with metallic textured finishes.' }
      ]
    };

    blocks.forEach(block => {
      const skillName = block.getAttribute('data-skill');
      const canvas = block.querySelector('.skill-magic-canvas');
      const ctx = canvas.getContext('2d');
      const progCircle = block.querySelector('.countdown-progress');
      const numText = block.querySelector('.countdown-number');
      
      let particles = [];
      let animationId = null;
      let countdownTimer = null;
      let holdProgress = 0;
      const HOLD_TIME = 3000;

      function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }

      function animateSparkles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        animationId = requestAnimationFrame(animateSparkles);
      }

      function updateCountdown() {
        holdProgress += 100;
        const remaining = Math.max(0, Math.ceil((HOLD_TIME - holdProgress) / 1000));
        numText.textContent = remaining;

        const offset = 100.5 - (holdProgress / HOLD_TIME) * 100.5;
        progCircle.style.strokeDashoffset = offset;

        if (holdProgress >= HOLD_TIME) {
          clearInterval(countdownTimer);
          showGallery(skillName);
          resetUI();
        }
      }

      function resetUI() {
        clearInterval(countdownTimer);
        holdProgress = 0;
        numText.textContent = '3';
        progCircle.style.strokeDashoffset = 100.5;
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      block.addEventListener('mouseenter', () => {
        resize();
        particles = Array.from({ length: 20 }, () => new Sparkle(canvas));
        animateSparkles();
        
        holdProgress = 0;
        countdownTimer = setInterval(updateCountdown, 100);
      });

      block.addEventListener('mouseleave', resetUI);
    });

    function showGallery(type) {
      if (!mockData[type]) return;
      galleryTitle.textContent = type;
      galleryGrid.innerHTML = mockData[type].map(item => `
        <div class="gallery-item">
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
        </div>
      `).join('');
      overlay.classList.add('open');
    }

    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  }

  const ambients = [];
  const AMB_COUNT = state.isMobile ? 20 : 50;
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
  for (let i = 0; i < AMB_COUNT; i++) ambients.push(new Ambient());

  // Mouse-reactive spawn
  let mouseTimer = 0;
  function spawnMouse() {
    if (++mouseTimer % 5 !== 0) return;
    if (particles.length >= COUNT + 30) particles.shift();
    const p = new Particle();
    p.x = state.mouse.x + (Math.random() - 0.5) * 24;
    p.y = state.mouse.y;
    p.speedY = -(Math.random() * 0.4 + 0.2);
    p.opacity = 0.18;
    particles.push(p);
  }

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    spawnMouse();
    ambients.forEach(p => { p.update(); p.draw(); });
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();

  initSkillMagic();
}

/* ═══════════════════════════════════════════════════════════
   6.  SCROLL PROGRESS BAR
═══════════════════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.appendChild(bar);
  (function upd() {
    const scrolled = window.pageYOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? scrolled / max * 100 : 0) + '%';
    requestAnimationFrame(upd);
  })();
}

/* ═══════════════════════════════════════════════════════════
   7.  NAV SCROLL STYLE
═══════════════════════════════════════════════════════════ */
function initNav() {
  const nav = $('#nav');
  (function upd() {
    nav.classList.toggle('scrolled', window.pageYOffset > 60);
    requestAnimationFrame(upd);
  })();
}

/* ═══════════════════════════════════════════════════════════
   8.  HERO TEXT PARALLAX  (mouse-driven)
═══════════════════════════════════════════════════════════ */
function initHeroParallax() {
  if (state.isMobile) return;
  const heroContent = $('#hero-content');
  const orbs = $$('.float-orb');

  document.addEventListener('mousemove', () => {
    const mx = state.mouse.nx;
    const my = state.mouse.ny;
    if (heroContent) {
      heroContent.style.transform =
        `translateX(calc(-50% + ${mx * 8}px)) translateY(${my * 5}px)`;
    }
    orbs.forEach((orb, i) => {
      const f = (i + 1) * 12;
      const s = i % 2 === 0 ? 1 : -1;
      orb.style.transform =
        `translate(${mx * f * s}px, ${my * f * 0.5}px)`;
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   9.  HERO TEXT — FADE AS SEQUENCE PROGRESSES
   Text stays visible longer, then fades, CTA shown at end
═══════════════════════════════════════════════════════════ */
function initHeroTextFade() {
  const heroContent = $('#hero-content');
  const scrollHint  = $('.hero-scroll-hint');
  const heroCta     = $('#hero-cta');

  window.addEventListener('scroll', () => {
    const container = $('#hero-scroll-container');
    if (!container || !heroContent) return;
    const scrolled = Math.max(0, -container.getBoundingClientRect().top);
    const totalScrollable = container.offsetHeight - window.innerHeight;
    const progress = Math.min(scrolled / totalScrollable, 1);

    // Fade text out only at the very end (between 80% and 95% scroll progress)
    // so it is highly visible during the bright cube frames
    const textOpacity = Math.max(0, 1 - (progress - 0.80) / 0.15);
    heroContent.style.opacity = textOpacity;

    // Hide scroll hint faster (0% to 10%)
    if (scrollHint) {
      scrollHint.style.opacity = Math.max(0, 1 - progress * 10);
    }
    
    // Show CTA button at the end of scroll (85% to 100%)
    if (heroCta) {
      if (progress > 0.85) {
        heroCta.classList.add('visible');
      } else {
        heroCta.classList.remove('visible');
      }
    }
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   10.  INTERSECTION REVEALS
═══════════════════════════════════════════════════════════ */
function initReveal() {
  const observe = (selector, threshold = 0.15) => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          const delay = (e.target.dataset.index || i) * 120;
          setTimeout(() => e.target.classList.add('in-view'), delay);
        }
      });
    }, { threshold });
    $$(selector).forEach(el => obs.observe(el));
  };

  observe('#about-panel');
  observe('.project-card', 0.1);
  observe('.skill-block', 0.2);
}

/* ═══════════════════════════════════════════════════════════
   11.  STAT COUNTERS
═══════════════════════════════════════════════════════════ */
function initStatCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const target = parseInt(e.target.dataset.target);
      const start  = Date.now();
      const dur    = 1800;
      (function tick() {
        const t = Math.min((Date.now() - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        e.target.textContent = Math.floor(ease * target);
        if (t < 1) requestAnimationFrame(tick);
      })();
      obs.unobserve(e.target);
    });
  }, { threshold: 0.5 });
  $$('.stat-num').forEach(n => obs.observe(n));
}

/* ═══════════════════════════════════════════════════════════
   12.  PROJECT CARD TILT
═══════════════════════════════════════════════════════════ */
function initCardTilt() {
  $$('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * -8;
      const ry = ((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) *  8;
      const ti = card.querySelector('.card-tilt-inner');
      const bg = card.querySelector('.card-bg');
      if (ti) ti.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (bg) bg.style.transform = `scale(1.06) translate(${(e.clientX - r.left - r.width/2) * 0.015}px, ${(e.clientY - r.top - r.height/2) * 0.015}px)`;
    });
    card.addEventListener('mouseleave', () => {
      const ti = card.querySelector('.card-tilt-inner');
      const bg = card.querySelector('.card-bg');
      if (ti) ti.style.transform = '';
      if (bg) bg.style.transform = '';
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   13.  PROJECT LIGHTBOX
═══════════════════════════════════════════════════════════ */
const projectData = [
  { title: 'Dashboard UI System',     desc: 'Premium dark dashboard with real-time analytics, glass morphism panels, and dynamic data visualization.', img: 'assets/images/project1.png', link: 'https://github.com/Pavanam4' },
  { title: 'Creative Agency Landing', desc: 'Bold cinematic landing page with gradient animation, scroll storytelling, and custom WebGL background.', img: 'assets/images/project2.png', link: '#' },
  { title: 'Premium E-commerce',      desc: 'Minimal product showcase with refined typography and immersive page transitions.', img: 'assets/images/project3.png', link: '#' },
  { title: 'SaaS Analytics App',      desc: 'Futuristic data visualization platform with neon accent system and dark UI.', img: 'assets/images/project4.png', link: '#' },
  { title: '3D Interactive Experience', desc: 'Full WebGL 3D brand experience with particle systems and scroll-driven animation sequences. Awwwards-nominated.', img: null, link: null },
];

function initLightbox() {
  const lb = $('#project-lightbox');
  const lbClose = $('#lightbox-close');
  const lbImg   = $('#lightbox-img');
  const lbTitle = $('#lightbox-title');
  const lbDesc  = $('#lightbox-desc');
  const lbLink  = $('#lightbox-link');

  $$('.project-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const d = projectData[i];
      lbTitle.textContent = d.title;
      lbDesc.textContent  = d.desc;
      
      if (d.img) { 
        lbImg.src = d.img; 
        lbImg.style.display = 'block'; 
      } else { 
        lbImg.style.display = 'none'; 
      }

      if (d.link) {
        lbLink.href = d.link;
        lbLink.style.display = 'inline-block';
      } else {
        lbLink.style.display = 'none';
      }

      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };
  lbClose.addEventListener('click', close);
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ═══════════════════════════════════════════════════════════
   14.  SKILL BLOCKS MOUSE REPEL
═══════════════════════════════════════════════════════════ */
function initSkillsRepel() {
  if (state.isMobile) return;
  const skillsSection = $('#skills');
  document.addEventListener('mousemove', () => {
    if (!skillsSection) return;
    const sr = skillsSection.getBoundingClientRect();
    if (sr.top > window.innerHeight || sr.bottom < 0) return;
    const mx = state.mouse.x - sr.left;
    const my = state.mouse.y - sr.top;
    $$('.skill-block').forEach(block => {
      const br = block.getBoundingClientRect();
      const bx = br.left + br.width  / 2 - sr.left;
      const by = br.top  + br.height / 2 - sr.top;
      const dx = mx - bx, dy = my - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const R = 130;
      if (dist < R) {
        const f  = (R - dist) / R;
        const rx = -(dx / dist) * f * 20;
        const ry = -(dy / dist) * f * 20;
        block.style.transform   = `translateX(${rx}px) translateY(${ry}px) scale(1.05)`;
        block.style.borderColor = `rgba(255,255,255,${0.1 + f * 0.3})`;
        block.style.zIndex      = '10';
      } else {
        block.style.transform   = '';
        block.style.borderColor = '';
        block.style.zIndex      = '';
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   15.  CONTACT — SCROLL REVEALS
═══════════════════════════════════════════════════════════ */
function initContactReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  [$('#contact .contact-headline'), $('#contact .contact-sub')].forEach(el => {
    if (!el) return;
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(40px)';
    el.style.transition = 'opacity 1s 0.2s cubic-bezier(0.16,1,0.3,1), transform 1s 0.2s cubic-bezier(0.16,1,0.3,1)';
    obs.observe(el);
  });

  $$('.contact-btn').forEach((btn, i) => {
    btn.style.opacity    = '0';
    btn.style.transform  = 'translateY(30px)';
    btn.style.transition = `opacity 0.8s ${0.4 + i * 0.1}s cubic-bezier(0.16,1,0.3,1), transform 0.8s ${0.4 + i * 0.1}s cubic-bezier(0.16,1,0.3,1), background 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s`;
    obs.observe(btn);
  });
}

/* ═══════════════════════════════════════════════════════════
   16.  SECTION LABELS + TITLES REVEAL
═══════════════════════════════════════════════════════════ */
function initSectionLabels() {
  const obs1 = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1'; e.target.style.transform = 'translateX(0)';
        obs1.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  $$('.reveal-label, .about-label').forEach(el => {
    el.style.opacity = '0'; el.style.transform = 'translateX(-20px)';
    el.style.transition = 'opacity 0.8s 0.1s ease, transform 0.8s 0.1s ease';
    obs1.observe(el);
  });

  const obs2 = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)';
        obs2.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });

  $$('.section-title').forEach(t => {
    t.style.opacity = '0'; t.style.transform = 'translateY(30px)';
    t.style.transition = 'opacity 1s 0.2s cubic-bezier(0.16,1,0.3,1), transform 1s 0.2s cubic-bezier(0.16,1,0.3,1)';
    obs2.observe(t);
  });
}

/* ═══════════════════════════════════════════════════════════
   17.  CONTACT WORD GLOW BREATHE
═══════════════════════════════════════════════════════════ */
function initContactGlow() {
  const word = $('.contact-word-glow');
  if (!word) return;
  word.setAttribute('data-text', word.textContent);
  let t = 0;
  (function animate() {
    t += 0.018;
    word.style.transform = `scale(${1 + Math.sin(t) * 0.003})`;
    requestAnimationFrame(animate);
  })();
}

/* ═══════════════════════════════════════════════════════════
   18.  AMBIENT BG SHIFT FOR PROJECTS SECTION
═══════════════════════════════════════════════════════════ */
function initProjectsBgShift() {
  const section = $('#projects');
  if (!section) return;
  (function upd() {
    const r = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(-r.top / (section.offsetHeight - window.innerHeight), 1));
    section.style.background =
      `radial-gradient(ellipse 60% 40% at ${20 + progress * 60}% ${30 + progress * 40}%,rgba(157,78,221,0.06) 0%,transparent 70%),#030014`;
    requestAnimationFrame(upd);
  })();
}

/* ═══════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initSequence();
  initSmoothScroll();
  initCursor();
  initParticles();
  initScrollProgress();
  initNav();
  initHeroParallax();
  initHeroTextFade();
  initReveal();
  initStatCounters();
  initCardTilt();
  initLightbox();
  initSkillsRepel();
  initContactReveal();
  initSectionLabels();
  initContactGlow();
  initProjectsBgShift();
});
