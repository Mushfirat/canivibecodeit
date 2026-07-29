/* Can I Vibecode It? — interactions. No frameworks, on purpose. */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const track = (event, props) => window.posthog?.capture(event, props);

  /* ---------- toast ---------- */
  let toastTimer;
  const toast = (msg) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  };

  /* ---------- theme toggle ---------- */
  $('[data-toggle-theme]')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    track('theme_toggle', { theme: next });
  });

  /* ---------- search filter + chips ---------- */
  const search = $('#search');
  const rows = $$('#rows .row');
  let activeCat = '';

  const applyFilter = () => {
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    rows.forEach((r) => {
      const hit =
        (!q || r.dataset.name.includes(q)) &&
        (!activeCat || r.dataset.category === activeCat);
      r.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    const empty = $('#no-results');
    if (empty) empty.hidden = shown > 0;
  };

  search?.addEventListener('input', applyFilter);
  search?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const visible = rows.filter((r) => r.style.display !== 'none');
    if (visible.length >= 1) visible[0].click();
  });

  // Chips are real links (SEO); on the homepage they filter in place instead.
  const chips = $('#chips');
  if (chips && rows.length) {
    chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      activeCat = chip.dataset.cat || '';
      $$('.chip', chips).forEach((c) => c.classList.toggle('active', c === chip));
      applyFilter();
      track('category_filter', { category: activeCat || 'all' });
    });
  }

  /* ---------- odometer ---------- */
  const setOdometer = (value) => {
    const od = $('#ticker .odometer');
    if (!od) return;
    const chars = [...('$' + value.toLocaleString('en-US'))];
    const digits = $$('.digit, .sym', od);
    // Digit count changed (rolled past a comma boundary): fall back to plain
    // text — the next full page load rebuilds the reels.
    if (digits.length !== chars.length) {
      od.textContent = chars.join('');
      return;
    }
    chars.forEach((ch, i) => {
      const el = digits[i];
      if (!/\d/.test(ch) || el.dataset.digit === ch) return;
      el.dataset.digit = ch;
      const reel = $('.reel', el);
      if (reel) reel.style.transform = `translateY(calc(${-ch} * clamp(36px, 5.6vw, 56px)))`;
    });
  };

  // Roll the odometer in from zero on first view, once.
  const ticker = $('#ticker');
  if (ticker && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const total = Number(ticker.dataset.total || 0);
    if (total > 0) {
      $$('.digit .reel', ticker).forEach((r) => (r.style.transform = 'translateY(0)'));
      requestAnimationFrame(() =>
        setTimeout(() => setOdometer(total), 250)
      );
    }
  }

  /* ---------- live stats poll ---------- */
  const refreshStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const { mrr, votes } = await res.json();
      setOdometer(mrr);
      $$('[data-votes]').forEach((el) => {
        const v = votes[el.dataset.votes];
        if (v !== undefined && el.textContent !== String(v)) el.textContent = v;
      });
    } catch {}
  };
  if ($('#ticker')) setInterval(refreshStats, 30000);

  /* ---------- per-agent prompt copy ---------- */
  const AGENTS = {
    'claude-code': {
      name: 'Claude Code',
      header: '# Run `claude` in an empty folder and paste this prompt.\n# Claude Code will scaffold, write, and run everything itself.\n\n',
    },
    codex: {
      name: 'Codex',
      header: '# Run `codex` in an empty folder and paste this prompt.\n# Approve the plan, then let it build.\n\n',
    },
    cursor: {
      name: 'Cursor',
      header: '# Open an empty folder in Cursor, press Cmd+I (agent), paste this prompt.\n\n',
    },
  };

  $$('.copy-group').forEach((group) => {
    const slug = group.dataset.slug;
    group.addEventListener('click', async (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const agent = AGENTS[btn.dataset.agent];
      const prompt = $('#prompt-text')?.textContent || '';
      try {
        await navigator.clipboard.writeText(agent.header + prompt);
      } catch {
        toast('copy failed — select the text manually');
        return;
      }
      const label = $('span:last-child', btn);
      const original = label.textContent;
      label.textContent = 'copied ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        label.textContent = original;
        btn.classList.remove('copied');
      }, 1800);
      toast(`prompt ready for ${agent.name} — go one-shot it`);
      track('copy_prompt', { app: slug, agent: btn.dataset.agent });
    });
  });

  /* ---------- vote ---------- */
  $$('[data-vote]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const slug = btn.dataset.vote;
      if (localStorage.getItem(`voted:${slug}`)) {
        toast('already counted — one funeral per person');
        return;
      }
      btn.classList.remove('voted');
      void btn.offsetWidth; // restart animation
      btn.classList.add('voted');
      try {
        const res = await fetch(`/api/vote/${slug}`, { method: 'POST' });
        if (res.status === 429) {
          localStorage.setItem(`voted:${slug}`, '1');
          toast('already counted — one funeral per person');
          return;
        }
        const { count, mrr } = await res.json();
        $$(`[data-votes="${slug}"]`).forEach((el) => (el.textContent = count));
        if (mrr) setOdometer(mrr);
        localStorage.setItem(`voted:${slug}`, '1');
        toast('☠ counted. RIP that subscription.');
        track('vote', { app: slug });
      } catch {
        toast('something broke — try again');
      }
    });
  });

  /* ---------- share ---------- */
  $$('[data-share]').forEach((a) =>
    a.addEventListener('click', () => track('share', { app: a.dataset.share }))
  );

  /* ---------- waitlist ---------- */
  $$('form[data-waitlist]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button', form);
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      }).catch(() => null);
      if (res?.ok) {
        btn.textContent = "you're in ✓";
        btn.disabled = true;
        form.querySelector('input[type=email]').disabled = true;
        toast("on the list — you'll hear about the scanner first");
        track('waitlist_signup');
      } else {
        toast(res?.status === 429 ? 'slow down a little' : 'that email looks off');
      }
    });
  });

  /* ---------- reveal on scroll ---------- */
  const revealables = $$('.reveal');
  if (revealables.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.15 }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('in'));
  }
})();
