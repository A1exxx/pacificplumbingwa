(() => {
  // Header gets a background once the page scrolls.
  const header = document.querySelector('[data-header]');
  if (header) {
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px';
    document.body.prepend(sentinel);
    new IntersectionObserver(([e]) => header.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);
  }

  // Fade-up on scroll. Only blocks below the fold are hidden, and only once JS runs.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('pre');
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      io.observe(el);
    });
  }

  // Services tabs, deep-linkable by hash.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  if (tabs.length) {
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (id, focus) => {
      tabs.forEach((t, i) => {
        const on = panels[i].id === id;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        if (on && focus) t.focus();
      });
    };
    const fromHash = () => {
      const id = location.hash.slice(1);
      select(panels.some((p) => p.id === id) ? id : panels[0].id);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => {
        history.replaceState(null, '', `#${panels[i].id}`);
        select(panels[i].id);
      });
      t.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!dir) return;
        const next = panels[(i + dir + panels.length) % panels.length].id;
        history.replaceState(null, '', `#${next}`);
        select(next, true);
      });
    });
    addEventListener('hashchange', fromHash);
    fromHash();
  }

  // Request form: inline validation, then send to the owner's inbox through FormSubmit.
  const form = document.querySelector('[data-form]');
  if (form) {
    const fields = [...form.querySelectorAll('[data-required]')];
    const check = (input) => {
      const box = input.closest('.field');
      const ok = input.type === 'tel' ? input.value.replace(/\D/g, '').length >= 10 : input.value.trim().length > 1;
      box.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', !ok);
      return ok;
    };
    fields.forEach((f) => f.addEventListener('blur', () => f.value && check(f)));

    // Prefill the problem box when coming from a service page.
    const topics = { repipe: 'Repipe quote: ', drains: 'Clogged drain: ', 'water-heater': 'Water heater: ', leak: 'Possible leak: ', repair: 'Repair: ' };
    const topic = topics[new URLSearchParams(location.search).get('service')];
    const issue = form.querySelector('#f-issue');
    if (topic && issue && !issue.value) issue.value = topic;

    const file = form.querySelector('input[type="file"]');
    if (file) {
      file.addEventListener('change', () => {
        const label = file.closest('.file').querySelector('span');
        label.textContent = file.files.length ? `${file.files[0].name}` : 'Add a photo of the problem (optional)';
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = fields.filter((f) => !check(f));
      if (bad.length) { bad[0].focus(); return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      const err = form.querySelector('[data-form-error]');
      if (err) err.hidden = true;
      const data = new FormData(form);
      const service = form.querySelector('#f-service');
      data.set('_subject', 'New request from pacificplumbingwa.com: ' + (service && service.value ? service.options[service.selectedIndex].text : 'plumbing'));
      data.set('_template', 'table');
      data.set('_captcha', 'false');
      const src = new URLSearchParams(location.search);
      ['utm_source', 'utm_content'].forEach((k) => { if (src.get(k)) data.set(k, src.get(k)); });
      const photo = data.get('photo');
      if (photo && !photo.size) data.delete('photo');
      fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
          if (!ok || String(j.success) !== 'true') throw new Error(j.message || 'send failed');
          form.hidden = true;
          const done = document.querySelector('[data-success]');
          done.classList.add('is-on');
          done.focus();
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = 'Send my request';
          if (err) { err.hidden = false; err.focus && err.focus(); }
        });
    });
  }
})();
