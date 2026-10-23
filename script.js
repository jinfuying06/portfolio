/* ================================================================
   Kim Boyeong Portfolio — interactions
   스크롤 등장(순차) · 스크롤 스파이 · 탭(키보드) · 라이트박스
   ================================================================ */
(() => {
  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Email ----------
     스팸 수집 봇 대비: HTML엔 주소를 그대로 두지 않고 열릴 때 조합. */
  document.querySelectorAll('[data-user][data-domain]').forEach(a => {
    const email = `${a.dataset.user}@${a.dataset.domain}`;
    a.href = `mailto:${email}`;
    a.textContent = email;
  });

  /* ---------- Latest PDFs ----------
     배포 시 생성된 목록을 읽어 upt 날짜가 가장 최신인 원본 PDF에 직접 연결. */
  const pdfLinks = [...document.querySelectorAll('[data-latest-pdf]')];
  pdfLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });
  });

  fetch('assets/pdf/latest.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`PDF manifest: ${response.status}`);
      return response.json();
    })
    .then(manifest => {
      pdfLinks.forEach(link => {
        const fileName = manifest[link.dataset.latestPdf];
        const valid = typeof fileName === 'string'
          && /^upt[_-]?\d{6,8}[^/\\]*\.pdf$/i.test(fileName);
        if (!valid) return;

        link.href = `assets/pdf/${encodeURIComponent(fileName)}`;
        link.removeAttribute('aria-disabled');
      });
    })
    .catch(() => {
      pdfLinks.forEach(link => {
        link.title = '최신 PDF 정보를 불러오지 못했습니다.';
      });
    });

  /* ---------- 1. Scroll reveal ----------
     같은 부모 안의 .reveal 형제들에 순서(--i)를 매겨 순차로 등장.
     등장은 CSS animation(backwards)이라 끝난 뒤 hover 효과를 방해하지 않음 */
  const reveals = document.querySelectorAll('.reveal');
  const order = new Map();
  reveals.forEach(el => {
    const i = order.get(el.parentElement) || 0;
    el.style.setProperty('--i', Math.min(i, 6));
    order.set(el.parentElement, i + 1);
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- 2. Scroll spy ---------- */
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let ticking = false;
  const spy = () => {
    ticking = false;
    const y = window.scrollY + window.innerHeight * 0.35;
    let current = '';
    sections.forEach(s => { if (s.offsetTop <= y) current = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1).id;
    navLinks.forEach(a => {
      const on = a.getAttribute('href') === `#${current}`;
      a.classList.toggle('is-active', on);
      on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();

  /* ---------- 3. Tabs (ARIA + 방향키) ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(list => {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step) { e.preventDefault(); select(tabs[(idx + step + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs.at(-1), true); }
      });
    });
  });

  /* ---------- 4. Lightbox (같은 프로젝트 화면끼리 이전/다음) ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  const prevBtn = lb.querySelector('.prev'), nextBtn = lb.querySelector('.next');
  let group = [], idx = 0, lastFocus = null;
  const show = (i) => {
    idx = (i + group.length) % group.length;
    const btn = group[idx], img = btn.querySelector('img');
    lbImg.src = btn.dataset.full || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = group.length > 1 ? `${img.alt}  (${idx + 1}/${group.length})` : img.alt;
    prevBtn.hidden = nextBtn.hidden = group.length < 2;
  };
  const closeLb = () => {
    lb.hidden = true;
    document.body.style.overflow = '';
    lastFocus && lastFocus.focus();
  };
  document.querySelectorAll('.zoomable').forEach(btn => {
    btn.addEventListener('click', () => {
      const scope = btn.closest('.project-media') || btn.parentElement;
      group = [...scope.querySelectorAll('.zoomable')];
      lastFocus = btn;
      show(group.indexOf(btn));
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lightbox-close').focus();
    });
  });
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft' && group.length > 1) show(idx - 1);
    if (e.key === 'ArrowRight' && group.length > 1) show(idx + 1);
  });

})();
