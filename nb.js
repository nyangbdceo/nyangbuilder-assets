// 냥빌더 식스샵 공통 움직임. 블록이 늦게 그려지거나 다시 그려져도 새로 붙은 요소만 한 번씩 처리한다.
(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const once = (el, k) => (el.dataset['nb' + k] ? false : (el.dataset['nb' + k] = '1'));
  const pad = n => String(n).padStart(2, '0');
  // 식스샵이 메뉴 블록을 두 번 그리는 경우가 있어 맨 위(마지막) 것만 씀
  const theNav = () => [...document.querySelectorAll('.nav')].pop();

  // 섹션 사이 물결: 같은 모양을 두 번 이어 붙여 끊김 없이 흐르게
  const wavePath = (amp, phase) => {
    let d = 'M0 40';
    for (let x = 0; x <= 2880; x += 24) d += ` L${x} ${(40 + amp * Math.sin((x / 720) * 2 * Math.PI + phase)).toFixed(1)}`;
    return d + ' L2880 80 L0 80 Z';
  };
  const WAVE = `<svg class="back" viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="${wavePath(14, 1.4)}"/></svg>` +
    `<svg viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="${wavePath(11, 0)}"/></svg>`;

  // 스크롤하면 떠오르기
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });

  // 성과 숫자: 화면에 들어오면 0부터 올라감 (글자 노드만 바꿔서 감시를 다시 깨우지 않게)
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now();
    if (!el.firstChild) el.append('0');
    const step = t => { const k = Math.min(1, (t - t0) / 1400); el.firstChild.data = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString(); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .5 });

  // 히어로 바다: 선 여러 개가 일렁이고 마우스 근처에서 조금 더 높아짐
  const sea = cv => {
    const ctx = cv.getContext('2d');
    let W, H, mx = -9999, t = 0;
    const size = () => { const r = devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        const base = H * (0.25 + i * 0.085), amp = 10 + i * 2.2;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const lift = 26 * Math.exp(-((x - mx) ** 2) / 26000);
          const y = base + Math.sin(x * 0.006 + t * (0.6 + i * 0.05) + i) * amp - lift * (1 - i / 12);
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(142,197,255,${0.08 + i * 0.035})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    };
    const loop = () => { if (!cv.isConnected) return; t += 0.012; draw(); requestAnimationFrame(loop); };
    size(); addEventListener('resize', () => { if (cv.isConnected) { size(); if (calm) draw(); } });
    cv.parentElement.addEventListener('pointermove', e => { mx = e.clientX; });
    cv.parentElement.addEventListener('pointerleave', () => { mx = -9999; });
    calm ? draw() : loop();
  };

  // 첫 화면 뷰파인더 타임코드 (24fps)
  const timecode = tc => {
    if (calm) return;
    const t0 = performance.now();
    if (!tc.firstChild) tc.append('');
    const id = setInterval(() => {
      if (!tc.isConnected) return clearInterval(id);
      const f = Math.floor((performance.now() - t0) / (1000 / 24)), s = Math.floor(f / 24);
      tc.firstChild.data = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % 24)}`;
    }, 1000 / 24);
  };

  // 상단 메뉴: 현재 페이지 표시, 햄버거, 로그인 줄 맞춤
  const setMenu = (nav, open) => {
    const b = nav.querySelector('.burger');
    nav.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open);
    b.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  const alignUtil = () => {
    const g = theNav()?.querySelector('.util-g'), btn = theNav()?.querySelector('.wrap > .btn');
    if (g && btn) g.style.width = btn.offsetWidth ? btn.offsetWidth + 'px' : '';
  };
  const navInit = nav => {
    // 식스샵 섹션 틀이 쌓임 순서를 따로 만들어서 본문이 메뉴를 덮음 → 메뉴를 감싼 틀을 맨 위로
    for (let el = nav.parentElement; el && el !== document.body; el = el.parentElement) el.style.zIndex = '1000';
    const path = decodeURI(location.pathname).replace(/\/$/, '');
    nav.querySelectorAll('ul a, .m-menu a').forEach(a => {
      const p = decodeURI(new URL(a.href, location.href).pathname).replace(/\/$/, '');
      if (p && p === path) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
    });
    nav.querySelector('.burger')?.addEventListener('click', () => setMenu(nav, !nav.classList.contains('open')));
    nav.querySelectorAll('.m-menu a').forEach(a => a.addEventListener('click', () => setMenu(nav, false)));
    alignUtil();
  };
  addEventListener('keydown', e => { const n = theNav(); if (e.key === 'Escape' && n) setMenu(n, false); });
  addEventListener('resize', alignUtil);
  document.fonts?.ready.then(alignUtil);

  // 상단 메뉴: 어두운 첫 화면을 지나면 흰 배경으로
  const onScroll = () => {
    const nav = theNav();
    if (!nav) return;
    const hero = document.querySelector('.hero');
    nav.classList.toggle('solid', !hero || scrollY > hero.offsetHeight * .7);
    nav.classList.toggle('dim', scrollY > 8);
  };
  addEventListener('scroll', onScroll, { passive: true });

  // 탭: 주소 끝 #ebook / #order 로 바로 열 수도 있음
  const openTab = id => document.querySelectorAll('[role="tab"]').forEach(b => {
    const on = b.dataset.tab === id, panel = document.getElementById(b.dataset.tab);
    b.setAttribute('aria-selected', on);
    if (!panel) return;
    panel.hidden = !on;
    if (on) panel.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  });
  const hashTab = () => [...document.querySelectorAll('[role="tab"]')].some(b => '#' + b.dataset.tab === location.hash);
  addEventListener('hashchange', () => { if (hashTab()) openTab(location.hash.slice(1)); });

  const init = () => {
    document.querySelectorAll('.wave').forEach(w => { if (once(w, 'w')) w.innerHTML = WAVE; });
    document.querySelectorAll('.reveal, .stream, .pile').forEach(el => { if (once(el, 'r')) io.observe(el); });
    document.querySelectorAll('[data-count]').forEach(el => { if (once(el, 'c')) cio.observe(el); });
    document.querySelectorAll('canvas.sea').forEach(cv => { if (once(cv, 's')) sea(cv); });
    document.querySelectorAll('.vf-tc').forEach(tc => { if (once(tc, 't')) timecode(tc); });
    const navs = [...document.querySelectorAll('.nav')];
    navs.forEach((n, i) => { n.style.display = i < navs.length - 1 ? 'none' : ''; if (once(n, 'n')) navInit(n); });
    // 작업물 카드: 끊김 없이 옆으로 계속 흐르게 (카드를 한 번 더 복제)
    document.querySelectorAll('.rail').forEach(rail => {
      if (!rail.children.length || !once(rail, 'rail')) return;
      const track = document.createElement('div');
      track.className = 'track';
      track.append(...rail.children);
      track.append(...[...track.children].map(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); k.classList.add('in'); return k; }));
      rail.append(track);
      rail.classList.add('auto');
    });
    // 남은 작업 일정 점 (data-left / data-total 은 블록 설정값)
    document.querySelectorAll('[data-slots]').forEach(el => {
      if (!once(el, 'sl')) return;
      const left = +el.dataset.left, total = +el.dataset.total, month = el.dataset.month;
      const dots = Array.from({ length: total }, (_, i) => `<i class="${i >= left ? 'used' : ''}"></i>`).join('');
      el.innerHTML = left > 0
        ? `<span class="dots">${dots}</span><span>${month} 남은 작업 일정 <b>${left}건</b> / ${total}건</span>`
        : `<span class="dots">${dots}</span><span>${month} 작업 일정이 모두 찼어요. 다음 달로 안내드려요</span>`;
    });
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const fresh = tabs.filter(b => once(b, 'tab'));
    fresh.forEach(b => b.addEventListener('click', () => { openTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }));
    if (fresh.length) openTab(hashTab() ? location.hash.slice(1) : tabs[0].dataset.tab);
    onScroll();
  };

  // 블록은 페이지가 뜬 뒤에 그려지므로, 새 요소가 붙을 때마다 한 프레임 모아서 처리
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; init(); }); } };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
