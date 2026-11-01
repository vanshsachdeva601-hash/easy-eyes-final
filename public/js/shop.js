// ---------------------------------------------------------------
// shop.js  ->  search + filters + sort + product grid
// Filters URL mein save hote hain, isliye link share/refresh karne pe same result aata hai.
// ---------------------------------------------------------------
(function () {
  const $ = (s) => document.querySelector(s);
  const grid = $('#grid');
  const filtersEl = $('#filters');
  const scrim = $('#scrim');

  const GROUPS = [
    { key: 'category', label: 'Category', meta: 'categories' },
    { key: 'shape', label: 'Frame shape', meta: 'shapes' },
    { key: 'material', label: 'Material', meta: 'materials' },
    { key: 'gender', label: 'Made for', meta: 'genders' }
  ];
  const PRICES = [
    { id: '', label: 'Any price' },
    { id: '0-4999', label: 'Under ₹5,000' },
    { id: '5000-7999', label: '₹5,000 to ₹7,999' },
    { id: '8000-11999', label: '₹8,000 to ₹11,999' },
    { id: '12000-', label: '₹12,000 and above' }
  ];

  const state = { q: '', category: [], shape: [], material: [], gender: [], price: '', sort: 'featured' };
  let requestId = 0;

  // ---------- URL <-> state ----------
  function readUrl() {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    GROUPS.forEach((g) => (state[g.key] = (p.get(g.key) || '').split(',').filter(Boolean)));
    state.price = p.get('price') || '';
    state.sort = p.get('sort') || 'featured';
    return p.get('focus') === '1';
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    GROUPS.forEach((g) => state[g.key].length && p.set(g.key, state[g.key].join(',')));
    if (state.price) p.set('price', state.price);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    const qs = p.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function apiQuery() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    GROUPS.forEach((g) => state[g.key].length && p.set(g.key, state[g.key].join(',')));
    if (state.price) {
      const [min, max] = state.price.split('-');
      if (min) p.set('minPrice', min);
      if (max) p.set('maxPrice', max);
    }
    p.set('sort', state.sort);
    return p.toString();
  }

  function activeFilterCount() {
    return GROUPS.reduce((n, g) => n + state[g.key].length, 0) + (state.price ? 1 : 0);
  }

  // ---------- filters UI ----------
  function renderFilters(meta) {
    const groups = GROUPS.map((g) => `
      <fieldset class="filter-group">
        <legend>${g.label}</legend>
        <div class="chips">
          ${(meta[g.meta] || []).map((o) => `
            <label class="chip">
              <input type="checkbox" name="${g.key}" value="${EE.esc(o.value)}" ${state[g.key].includes(o.value) ? 'checked' : ''}>
              <span>${EE.esc(o.value)}<i>${o.count}</i></span>
            </label>`).join('')}
        </div>
      </fieldset>`).join('');

    const price = `
      <fieldset class="filter-group">
        <legend>Price</legend>
        <div class="radios">
          ${PRICES.map((o) => `
            <label class="radio">
              <input type="radio" name="price" value="${o.id}" ${state.price === o.id ? 'checked' : ''}>
              <span>${o.label}</span>
            </label>`).join('')}
        </div>
      </fieldset>`;

    $('#filter-groups').innerHTML = groups + price;
  }

  function syncControls() {
    $('#q').value = state.q;
    $('#sort').value = state.sort;
    document.querySelectorAll('#filters input[type=checkbox]').forEach((i) => {
      i.checked = state[i.name].includes(i.value);
    });
    document.querySelectorAll('#filters input[name=price]').forEach((i) => {
      i.checked = i.value === state.price;
    });
    const n = activeFilterCount();
    $('#open-filters').textContent = n ? `Filters (${n})` : 'Filters';
  }

  // ---------- products ----------
  async function loadProducts() {
    const id = ++requestId;
    grid.classList.add('loading');
    try {
      const res = await fetch('/api/products?' + apiQuery());
      if (!res.ok) throw new Error('bad response');
      const { products } = await res.json();
      if (id !== requestId) return; // purana response ignore karo

      $('#count').textContent = `${products.length} ${products.length === 1 ? 'frame' : 'frames'}`;
      grid.innerHTML = products.length
        ? products.map(EE.productCard).join('')
        : `<div class="empty-state">
             <p>No frames match these filters.</p>
             <button type="button" class="btn btn-dark btn-plain" id="empty-clear">Clear all filters</button>
           </div>`;
      const emptyClear = $('#empty-clear');
      if (emptyClear) emptyClear.addEventListener('click', clearAll);
    } catch (err) {
      if (id !== requestId) return;
      $('#count').textContent = '';
      grid.innerHTML = '<p class="empty-note">We could not load the frames. Check that the server is running and refresh the page.</p>';
    } finally {
      if (id === requestId) {
        grid.classList.remove('loading');
      }
    }
  }

  function update() {
    writeUrl();
    syncControls();
    loadProducts();
  }

  function clearAll() {
    Object.assign(state, { q: '', category: [], shape: [], material: [], gender: [], price: '', sort: 'featured' });
    update();
  }

  // ---------- events ----------
  $('#filters').addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'checkbox') {
      state[t.name] = [...document.querySelectorAll(`#filters input[name="${t.name}"]:checked`)].map((i) => i.value);
    } else if (t.name === 'price') {
      state.price = t.value;
    }
    update();
  });

  let timer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { state.q = e.target.value.trim(); update(); }, 250);
  });

  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });
  $('#clear').addEventListener('click', clearAll);

  // mobile filter drawer
  const openDrawer = () => { filtersEl.classList.add('open'); scrim.classList.add('show'); if (EE.lenis) EE.lenis.stop(); };
  const closeDrawer = () => { filtersEl.classList.remove('open'); scrim.classList.remove('show'); if (EE.lenis) EE.lenis.start(); };
  $('#open-filters').addEventListener('click', openDrawer);
  $('#close-filters').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  // ---------- start ----------
  (async function init() {
    const focusSearch = readUrl();
    try {
      const res = await fetch('/api/products/meta');
      renderFilters(await res.json());
    } catch (e) {
      $('#filter-groups').innerHTML = '';
    }
    syncControls();
    loadProducts();
    if (focusSearch) $('#q').focus();
  })();
})();
