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
  // 작업물 카드: 오목한 원통 안쪽 벽을 따라 천천히 도는 3D 슬라이드 (가운데는 정면, 양옆은 이쪽으로 돌아오며 조금 커짐)
  // 손으로 끄는 기능 없이 계속 흐르고, 마우스를 올리면 잠깐 멈춤. 가운데 카드만 제 색으로 재생, 양옆은 파랗게 가라앉음.
  const arc = rail => {
    const base = [...rail.children];
    rail.classList.add('arc');
    let cards = base, step = 0, W = 0, R = 0, mid = 0, pos = 0, seen = false, hold = false, cur = -1;
    const MAX = .9; // 이 각도(약 50도)보다 더 돈 카드는 화면 밖이라 숨김
    const fill = () => {
      W = base[0].offsetWidth; step = W + (innerWidth > 700 ? 30 : 16);
      // 원통 반지름: 작을수록 많이 휨. 화면 폭 정도면 끝 카드가 25도쯤 돌아옴 (더 휘면 카드가 찌그러져 보임)
      R = Math.max(step * 4.5, document.documentElement.clientWidth * 1.1);
      // 띠가 화면보다 넓게 그려지는 경우가 있어 '보이는 화면'의 가운데를 기준으로 삼음
      mid = document.documentElement.clientWidth / 2 - rail.getBoundingClientRect().left;
      // 원통 양끝(MAX 각도 밖)은 숨기므로, 띠가 한 바퀴 이어 붙는 자리가 그 숨은 구간에 오도록 카드를 넉넉히 채움
      // (원근 때문에 옆으로 돌아온 카드는 크게 보여 화면 안으로 들어오니, 화면 폭이 아니라 각도로 잼)
      const need = 2 * R * MAX + step * 2;
      while (cards.length * step < need && cards.length < base.length * 12) {
        const more = base.map(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); return k; });
        rail.append(...more); cards = cards.concat(more);
      }
      // 양옆 카드가 커져도 위아래가 잘리지 않게 여유를 두고, 원근의 중심을 카드 한가운데에
      const H = base[0].offsetHeight;
      rail.style.height = H * 1.3 + 40 + 'px';
      rail.style.setProperty('--top', H * .15 + 20 + 'px');
      rail.style.perspectiveOrigin = `${mid}px ${H * .65 + 20}px`;
    };
    const place = () => {
      const total = cards.length * step;
      let near = 0, best = 1e9;
      cards.forEach((c, i) => {
        let x = ((i * step - pos) % total + total) % total;
        if (x > total / 2) x -= total;
        // 원통 벽을 x 만큼 따라간 자리: 각도 a, 가로 R·sin a, 이쪽으로 다가옴 R·(1-cos a), 카드는 원통 중심을 바라보게 회전
        const a = x / R, far = Math.min(1, Math.abs(x) / step);
        if (Math.abs(x) < best) { best = Math.abs(x); near = i; }
        c.style.transform = `translate3d(${mid - W / 2 + R * Math.sin(a)}px,0,${R * (1 - Math.cos(a))}px) rotateY(${-a}rad)`;
        c.style.setProperty('--far', far.toFixed(3));
        // 숨길 카드는 아예 빼 둠: 원통 뒤쪽 카드는 눈(원근 시점)보다 뒤로 넘어가는데, 그런 3D 카드가 남아 있으면 크롬이 띠 전체를 안 그리는 경우가 있음
        c.style.display = Math.abs(a) > MAX ? 'none' : '';
      });
      if (near !== cur) {
        cur = near;
        cards.forEach((c, i) => { const v = c.querySelector('video'); if (v) i === near ? v.play().catch(() => {}) : v.pause(); });
      }
    };
    let last = performance.now();
    const loop = t => {
      if (!rail.isConnected) return;
      requestAnimationFrame(loop);
      const dt = Math.min(64, t - last); last = t;
      if (!seen) return;
      if (!calm && !hold) pos += dt * .07;
      place();
    };
    rail.addEventListener('mouseenter', () => { hold = true; });
    rail.addEventListener('mouseleave', () => { hold = false; });
    new IntersectionObserver(es => es.forEach(e => { seen = e.isIntersecting; })).observe(rail);
    fill(); place(); requestAnimationFrame(loop);
    // 창 크기뿐 아니라 편집기 미리보기처럼 띠 너비만 바뀌어도 다시 계산
    new ResizeObserver(() => { if (rail.isConnected && base[0].offsetWidth) { fill(); place(); } }).observe(rail);
  };

  // 하위 메뉴: 블록 설정의 링크 묶음을 '붙일 메뉴 주소'와 같은 메뉴 밑에 붙임 (PC는 펼침 상자, 모바일은 들여쓴 줄)
  const addSub = nav => {
    const src = nav.querySelector('.nav-sub-src');
    if (!src || !src.children.length) return;
    const key = (src.dataset.for || '').replace(/\/$/, '');
    const same = a => new URL(a.href, location.href).pathname.replace(/\/$/, '') === key;
    const li = [...nav.querySelectorAll('.wrap ul > li')].find(l => same(l.querySelector('a')));
    // 지금 페이지가 하위 메뉴 중 하나면 부모 메뉴(예: CLASS)도 현재 위치로 표시
    const here = decodeURI(location.pathname).replace(/\/$/, '');
    const inSub = [...src.querySelectorAll('a')].some(a => decodeURI(new URL(a.href, location.href).pathname).replace(/\/$/, '') === here);
    if (inSub) [li?.querySelector('a'), [...nav.querySelectorAll('.m-menu > a')].find(same)].forEach(a => { if (a) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); } });
    if (li) {
      const box = document.createElement('div');
      box.className = 'sub';
      box.innerHTML = '<div class="sub-in"><small class="sub-head"></small>' + src.innerHTML + '</div>';
      // 상자 맨 위에 어느 메뉴의 하위인지 작게 (예: CLASS)
      box.querySelector('.sub-head').textContent = li.querySelector('a').textContent.trim();
      li.classList.add('has-sub');
      li.append(box);
    }
    let m = [...nav.querySelectorAll('.m-menu > a')].find(same);
    if (m) {
      // 식스샵이 링크 클릭을 가로채 페이지를 옮기므로, 주소 없는 복제본(가로채기 없음)으로 바꿔 펼침 버튼으로 씀
      const t = m.cloneNode(true);
      ['href', 'data-intercepted'].forEach(k => t.removeAttribute(k));
      t.setAttribute('role', 'button'); t.tabIndex = 0;
      m.replaceWith(t); m = t;
      const box = document.createElement('div');
      box.className = 'm-sub';
      box.innerHTML = src.innerHTML;
      m.after(box);
      // 모바일은 펼침 메뉴: 누르면 하위 메뉴가 열리고 닫힘 (지금 그 안의 페이지면 처음부터 열어 둠)
      m.classList.add('m-has-sub');
      const show = v => { box.classList.toggle('open', v); m.setAttribute('aria-expanded', String(v)); };
      show(inSub);
      m.addEventListener('click', e => { e.preventDefault(); show(!box.classList.contains('open')); });
      m.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); m.click(); } });
    }
  };
  const navInit = nav => {
    // 식스샵 섹션 틀이 쌓임 순서를 따로 만들어서 본문이 메뉴를 덮음 → 메뉴를 감싼 틀을 맨 위로
    for (let el = nav.parentElement; el && el !== document.body; el = el.parentElement) el.style.zIndex = '1000';
    const path = decodeURI(location.pathname).replace(/\/$/, '');
    nav.querySelectorAll('ul a, .m-menu a').forEach(a => {
      const p = decodeURI(new URL(a.href, location.href).pathname).replace(/\/$/, '');
      if (p && p === path) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); }
    });
    addSub(nav);
    nav.querySelector('.burger')?.addEventListener('click', () => setMenu(nav, !nav.classList.contains('open')));
    nav.querySelectorAll('.m-menu a:not(.m-has-sub)').forEach(a => a.addEventListener('click', () => setMenu(nav, false)));
    // 같은 페이지 안의 하위 메뉴(#web 등)는 주소가 같아도 다시 눌리면 그 위치로
    nav.querySelectorAll('.sub a, .m-sub a').forEach(a => a.addEventListener('click', e => {
      const u = new URL(a.href, location.href);
      if (u.pathname !== location.pathname || !u.hash) return;
      e.preventDefault();
      history.replaceState(null, '', u.hash);
      goHash();
    }));
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
  const openTab = id => document.querySelectorAll('[role="tab"][data-tab]').forEach(b => {
    const on = b.dataset.tab === id, panel = document.getElementById(b.dataset.tab);
    b.setAttribute('aria-selected', on);
    if (!panel) return;
    panel.hidden = !on;
    if (on) panel.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  });
  const hashTab = () => [...document.querySelectorAll('[role="tab"][data-tab]')].some(b => '#' + b.dataset.tab === location.hash);
  // 주소 끝 #이름 위치로: 탭이면 그 탭을 열고 탭 고르는 줄로, 아니면 그 섹션으로 (위 고정 메뉴만큼 띄움)
  const goHash = instant => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return false;
    const tab = [...document.querySelectorAll('[role="tab"][data-tab]')].find(b => b.dataset.tab === id);
    if (tab) openTab(id);
    const el = tab ? tab.parentElement : document.getElementById(id);
    if (!el) return false;
    const navH = theNav()?.querySelector('.wrap')?.getBoundingClientRect().bottom || 0;
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - navH - 24, behavior: instant === true ? 'instant' : 'smooth' });
    return true;
  };
  addEventListener('hashchange', () => goHash());
  let jumped = false;


  // 칼럼 코드 상자와 "복사" 상자에 복사 버튼
  const addCopy = (box, getText) => {
    const b = document.createElement('button');
    b.className = 'copy'; b.type = 'button'; b.textContent = '복사';
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(getText()); b.textContent = '복사됨 ✓'; }
      catch { b.textContent = '직접 드래그해 복사해 주세요'; }
      setTimeout(() => (b.textContent = '복사'), 1800);
    });
    box.append(b);
  };

  const init = () => {
    document.querySelectorAll('.wave').forEach(w => { if (once(w, 'w')) w.innerHTML = WAVE; });
    document.querySelectorAll('.reveal, .stream, .pile, .kt-grid').forEach(el => { if (once(el, 'r')) io.observe(el); });
    document.querySelectorAll('[data-count]').forEach(el => { if (once(el, 'c')) cio.observe(el); });
    document.querySelectorAll('canvas.sea').forEach(cv => { if (once(cv, 's')) sea(cv); });
    document.querySelectorAll('.vf-tc').forEach(tc => { if (once(tc, 't')) timecode(tc); });
    // 식스샵이 공통 영역(메뉴·푸터·카톡 버튼)을 두 번 그리는 경우가 있어 마지막 하나만 보이게
    ['.nav', 'footer#contact', '.kakao-float'].forEach(sel => {
      const all = [...document.querySelectorAll(sel)];
      all.forEach((el, i) => { el.style.display = i < all.length - 1 ? 'none' : ''; });
    });
    document.querySelectorAll('.nav').forEach(n => { if (once(n, 'n')) navInit(n); });
    document.querySelectorAll('.rail').forEach(rail => { if (rail.children.length && once(rail, 'rail')) arc(rail); });
    // 카톡 후기: 모바일 가로 슬라이드를 3.5초마다 다음 장으로 (손으로 넘기면 잠깐 멈춤)
    document.querySelectorAll('.kt-grid').forEach(g => {
      if (calm || !once(g, 'kt')) return;
      let hold = 0;
      ['touchstart', 'pointerdown', 'wheel'].forEach(ev => g.addEventListener(ev, () => { hold = Date.now() + 6000; }, { passive: true }));
      const id = setInterval(() => {
        if (!g.isConnected) return clearInterval(id);
        // 화면 폭 대신 실제로 옆으로 넘칠 때만 (식스샵 편집기의 모바일 미리보기에서도 돌게)
        const end = g.scrollWidth - g.clientWidth;
        if (end < 5 || Date.now() < hold || g.children.length < 2) return;
        const step = g.children[1].offsetLeft - g.children[0].offsetLeft;
        // 끝에 닿았을 때만 처음으로 (스냅 때문에 한 칸이 딱 안 떨어져도 마지막 장까지 보여 줌)
        const next = g.scrollLeft >= end - 5 ? 0 : Math.min(end, g.scrollLeft + step);
        const from = g.scrollLeft;
        g.scrollTo({ left: next, behavior: 'smooth' });
        // 부드러운 이동이 막힌 브라우저에서는 바로 이동
        setTimeout(() => { if (g.scrollLeft === from) g.scrollLeft = next; }, 700);
      }, 3500);
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
    const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
    const fresh = tabs.filter(b => once(b, 'tab'));
    fresh.forEach(b => b.addEventListener('click', () => { openTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); }));
    // 탭 이름을 비워 두면 그 클래스는 이 페이지에서 숨김. 하나만 남으면 탭 줄도 숨기고 그 클래스만 보여 줌
    fresh.forEach(b => { if (!b.querySelector('b')?.textContent.trim()) { b.hidden = true; const p = document.getElementById(b.dataset.tab); if (p) p.remove(); } });
    document.querySelectorAll('[role="tablist"]').forEach(l => { if (l.querySelectorAll('[role="tab"]:not([hidden])').length < 2) l.hidden = true; });
    const shown = tabs.filter(b => !b.hidden);
    if (fresh.length && shown.length) openTab(hashTab() && shown.some(b => '#' + b.dataset.tab === location.hash) ? location.hash.slice(1) : shown[0].dataset.tab);
    // 다른 페이지에서 /class#lecture 처럼 들어오면 블록이 다 그려진 뒤 그 위치로 (식스샵이 늦게 그려서 브라우저 기본 이동이 빗나감)
    if (!jumped && location.hash && (hashTab() || document.getElementById(decodeURIComponent(location.hash.slice(1))))) {
      jumped = true;
      setTimeout(() => goHash(true), 400);
    }
    document.querySelectorAll('.notion pre').forEach(pre => { if (once(pre, 'cp')) addCopy(pre, () => pre.querySelector('code')?.innerText ?? pre.innerText); });
    document.querySelectorAll('.notion .n-callout').forEach(box => {
      const head = box.querySelector(':scope > p:first-of-type b, :scope > b');
      if (!head || !head.textContent.includes('복사') || !once(box, 'cp')) return;
      box.classList.add('copyable');
      addCopy(box, () => {
        const c = box.cloneNode(true);
        c.querySelectorAll('.copy, .n-ic').forEach(el => el.remove());
        const h = c.querySelector(':scope > p:first-of-type');
        if (h && h.textContent.includes('복사')) h.remove();
        return c.innerText.trim();
      });
    });
    onScroll();
  };

  // 블록은 페이지가 뜬 뒤에 그려지므로, 새 요소가 붙을 때마다 한 프레임 모아서 처리
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; init(); }); } };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
})();
