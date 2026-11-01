// ---------------------------------------------------------------
// admin.js  ->  Admin panel: Dashboard, Products (add/edit/delete + photos), Orders
// Sirf role = admin wale user ke liye. Server bhi har request pe admin check karta hai.
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('admin-root');
  const user = await EE.requireUser();
  if (!user) return;

  if (user.role !== 'admin') {
    root.innerHTML = '<div class="empty-state"><p>Admin access only.</p><a class="btn" href="/">Back to home</a></div>';
    return;
  }

  const CATS = ['Sunglasses', 'Eyeglasses', 'Screen Glasses'];
  const STATUSES = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const TABS = [['dashboard', 'Dashboard'], ['products', 'Products'], ['orders', 'Orders']];
  const state = { tab: 'dashboard', products: [], orders: [], prodQ: '', orderQ: '', orderStatus: '', curProduct: null };
  const $ = (id) => document.getElementById(id);

  async function api(url, method = 'GET', body) {
    try {
      const res = await fetch(url, {
        method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { EE.toast(data.error || 'Something went wrong.'); return null; }
      return data;
    } catch (e) {
      EE.toast('Could not reach the server.');
      return null;
    }
  }

  // ---------------------- shell ----------------------
  root.innerHTML = `
    <div class="tabs" role="tablist" id="admin-tabs">
      ${TABS.map(([k, label]) => `<button type="button" role="tab" data-tab="${k}">${label}</button>`).join('')}
    </div>
    <div id="panel" class="admin-panel"></div>

    <dialog id="prod-dlg"><div class="dlg">
      <div class="dlg-head"><h2 id="pd-title">Add product</h2><button type="button" class="link-btn" id="pd-close">Close</button></div>
      <form id="pd-form" class="pform" novalidate>
        <div class="field"><label for="pd-name">Name</label><input id="pd-name" required></div>
        <div class="field-row">
          <div class="field"><label for="pd-cat">Category</label><select id="pd-cat">${CATS.map((c) => `<option>${c}</option>`).join('')}</select></div>
          <div class="field"><label for="pd-gender">Made for</label><select id="pd-gender"><option>Unisex</option><option>Men</option><option>Women</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="pd-price">Price (INR)</label><input id="pd-price" type="number" min="1" step="1" required></div>
          <div class="field"><label for="pd-stock">Stock</label><input id="pd-stock" type="number" min="0" step="1" required></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="pd-shape">Frame shape</label><input id="pd-shape" list="dl-shape"></div>
          <div class="field"><label for="pd-material">Material</label><input id="pd-material" list="dl-material"></div>
        </div>
        <div class="field"><label for="pd-color">Colour</label><input id="pd-color"></div>
        <div class="field"><label for="pd-desc">Description</label><textarea id="pd-desc" rows="3"></textarea></div>
        <label class="check"><input type="checkbox" id="pd-featured"><span>Featured (shown first, counts as best seller)</span></label>
        <datalist id="dl-shape"><option>Aviator<option>Round<option>Wayfarer<option>Cat-eye<option>Rectangle<option>Square<option>Hexagon</datalist>
        <datalist id="dl-material"><option>Acetate<option>Metal<option>Titanium</datalist>
        <p class="form-error" id="pd-error" role="alert"></p>
        <div class="dlg-actions"><button class="btn" type="submit" id="pd-save">Save product</button></div>
      </form>

      <section id="pd-images" hidden>
        <h3 class="sub">Photos</h3>
        <p class="hint">The first photo is the card photo, the second shows on hover. Use "Make main" to reorder.</p>
        <div class="img-grid" id="pd-grid"></div>
        <label class="btn btn-line upload">Upload photos<input type="file" id="pd-file" accept="image/jpeg,image/png,image/webp" multiple hidden></label>
        <p class="form-error" id="pd-upmsg" role="status"></p>
      </section>
    </div></dialog>

    <dialog id="ord-dlg"><div class="dlg" id="ord-body"></div></dialog>`;

  // ---------------------- tabs ----------------------
  function setTab(tab) {
    if (!TABS.some(([k]) => k === tab)) tab = 'dashboard';
    state.tab = tab;
    history.replaceState(null, '', '#' + tab);
    document.querySelectorAll('#admin-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    return ({ dashboard, products, orders })[tab]();
  }
  $('admin-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  window.addEventListener('hashchange', () => setTab(location.hash.slice(1)));

  const panel = $('panel');
  const thumb = (src) => `<span class="ph thumb-sm${src ? '' : ' is-empty'}" style="--ph:#F1E4DF">${EE.img(src, '')}</span>`;
  const statusPill = (s) => `<span class="status ${EE.esc(s)}">${EE.esc(s)}</span>`;

  // ---------------------- dashboard ----------------------
  async function dashboard() {
    panel.innerHTML = '<p class="empty-note">Loading...</p>';
    const [stats, ord] = await Promise.all([api('/api/admin/stats'), api('/api/admin/orders')]);
    if (!stats) { panel.innerHTML = '<p class="empty-note">Could not load the dashboard.</p>'; return; }
    if (ord) state.orders = ord.orders;
    const recent = state.orders.slice(0, 5);

    panel.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><span>Sales</span><strong>${EE.fmt(stats.sales)}</strong><em>excluding cancelled</em></div>
        <div class="stat-card"><span>Orders</span><strong>${stats.orders}</strong></div>
        <div class="stat-card"><span>Products</span><strong>${stats.products}</strong></div>
        <div class="stat-card"><span>Customers</span><strong>${stats.customers}</strong></div>
      </div>
      <div class="two-col">
        <section class="panel">
          <h2>Orders by status</h2>
          ${stats.byStatus.length ? `<div class="pill-row">${stats.byStatus.map((s) => `<span>${statusPill(s.status)} ${s.count}</span>`).join('')}</div>` : '<p class="hint">No orders yet.</p>'}
        </section>
        <section class="panel">
          <h2>Low stock (5 or fewer)</h2>
          ${stats.lowStock.length
            ? `<ul class="plain-list">${stats.lowStock.map((p) => `<li><a href="#products" data-edit="${p.id}">${EE.esc(p.name)}</a><span class="${p.stock === 0 ? 'out' : 'low'}">${p.stock === 0 ? 'Out of stock' : p.stock + ' left'}</span></li>`).join('')}</ul>`
            : '<p class="hint">All frames are well stocked.</p>'}
        </section>
      </div>
      <section class="panel">
        <h2>Recent orders</h2>
        ${recent.length ? orderTable(recent) : '<p class="hint">No orders yet.</p>'}
      </section>`;
  }

  panel.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    if (!edit) return;
    e.preventDefault();
    await setTab('products'); // list load hone ka intezaar, phir dialog kholo
    const p = state.products.find((x) => x.id === Number(edit.dataset.edit));
    if (p) openProduct(p);
  });

  // ---------------------- products ----------------------
  async function products() {
    panel.innerHTML = '<p class="empty-note">Loading...</p>';
    const data = await api('/api/products?limit=100&sort=newest');
    if (!data) { panel.innerHTML = '<p class="empty-note">Could not load products.</p>'; return; }
    state.products = data.products;
    drawProducts();
  }

  function drawProducts() {
    const q = state.prodQ.toLowerCase();
    const list = state.products.filter((p) => !q || `${p.name} ${p.category} ${p.shape} ${p.color}`.toLowerCase().includes(q));
    panel.innerHTML = `
      <div class="admin-bar">
        <input id="prod-search" type="search" placeholder="Search products" value="${EE.esc(state.prodQ)}" aria-label="Search products">
        <button class="btn" type="button" id="prod-add">Add product</button>
      </div>
      <div class="table-wrap"><table class="admin-table">
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th></th></tr></thead>
        <tbody>
          ${list.map((p) => `
            <tr>
              <td>${thumb(p.image1)}</td>
              <td><strong>${EE.esc(p.name)}</strong><br><span class="muted">${EE.esc(p.shape || '')}, ${EE.esc(p.color || '')}</span></td>
              <td>${EE.esc(p.category)}</td>
              <td class="mono">${EE.fmt(p.price)}</td>
              <td class="mono ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : ''}">${p.stock}</td>
              <td>${p.featured ? 'Yes' : ''}</td>
              <td class="row-actions">
                <button type="button" class="link-btn" data-act="edit" data-id="${p.id}">Edit</button>
                <button type="button" class="link-btn danger" data-act="delete" data-id="${p.id}">Delete</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="7" class="muted">No products match.</td></tr>'}
        </tbody>
      </table></div>`;

    $('prod-add').addEventListener('click', () => openProduct(null));
    $('prod-search').addEventListener('input', (e) => {
      state.prodQ = e.target.value;
      const pos = e.target.selectionStart;
      drawProducts();
      const s = $('prod-search'); s.focus(); s.setSelectionRange(pos, pos);
    });
    panel.querySelector('tbody').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const p = state.products.find((x) => x.id === Number(b.dataset.id));
      if (b.dataset.act === 'edit') openProduct(p);
      if (b.dataset.act === 'delete') {
        if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
        if (await api('/api/products/' + p.id, 'DELETE')) { EE.toast('Product deleted.'); products(); }
      }
    });
  }

  // ---------------------- product dialog ----------------------
  const dlg = $('prod-dlg');
  $('pd-close').addEventListener('click', () => dlg.close());

  function openProduct(p) {
    state.curProduct = p;
    $('pd-title').textContent = p ? `Edit ${p.name}` : 'Add product';
    $('pd-name').value = p ? p.name : '';
    $('pd-cat').value = p ? p.category : CATS[0];
    $('pd-gender').value = p && p.gender ? p.gender : 'Unisex';
    $('pd-price').value = p ? p.price : '';
    $('pd-stock').value = p ? p.stock : 10;
    $('pd-shape').value = p ? p.shape || '' : '';
    $('pd-material').value = p ? p.material || '' : '';
    $('pd-color').value = p ? p.color || '' : '';
    $('pd-desc').value = p ? p.description || '' : '';
    $('pd-featured').checked = !!(p && p.featured);
    $('pd-error').textContent = '';
    $('pd-upmsg').textContent = '';
    showImages(p);
    if (!dlg.open) dlg.showModal();
  }

  async function showImages(p) {
    const sec = $('pd-images');
    sec.hidden = !p;
    if (!p) return;
    const data = await api(`/api/admin/products/${p.id}/images`);
    drawImages(data ? data.images : []);
  }

  function drawImages(images) {
    $('pd-grid').innerHTML = images.length
      ? images.map((src, i) => {
          const file = src.split('/').pop().split('?')[0];
          return `<figure class="img-item">
            <span class="ph" style="--ph:#F1E4DF"><img src="${EE.esc(EE.imgUrl(src, 240))}" alt=""></span>
            <figcaption>
              ${i === 0 ? '<b>Main</b>' : `<button type="button" class="link-btn" data-img="main" data-file="${EE.esc(file)}">Make main</button>`}
              <button type="button" class="link-btn danger" data-img="delete" data-file="${EE.esc(file)}">Delete</button>
            </figcaption></figure>`;
        }).join('')
      : '<p class="hint">No photos yet. Upload some below.</p>';
  }

  $('pd-grid').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-img]');
    if (!b || !state.curProduct) return;
    const id = state.curProduct.id, file = encodeURIComponent(b.dataset.file);
    const data = b.dataset.img === 'delete'
      ? (confirm('Delete this photo?') ? await api(`/api/admin/products/${id}/images?file=${file}`, 'DELETE') : null)
      : await api(`/api/admin/products/${id}/images/main`, 'POST', { file: b.dataset.file });
    if (data) drawImages(data.images);
  });

  // Photo ko chhota (max 1600px) karke JPEG banao, taaki upload tez aur halka rahe
  function toDataUrl(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale);
        c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read ' + file.name)); };
      img.src = url;
    });
  }

  $('pd-file').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length || !state.curProduct) return;
    const msg = $('pd-upmsg');
    msg.style.color = '';
    for (let i = 0; i < files.length; i++) {
      msg.textContent = `Uploading ${i + 1} of ${files.length}...`;
      try {
        const dataUrl = await toDataUrl(files[i]);
        const data = await api(`/api/admin/products/${state.curProduct.id}/images`, 'POST', { dataUrl });
        if (!data) { msg.textContent = `Stopped at ${files[i].name}.`; return; }
        drawImages(data.images);
      } catch (err) {
        msg.textContent = err.message;
        return;
      }
    }
    msg.textContent = 'Done.';
    products();
  });

  $('pd-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('pd-error'), btn = $('pd-save');
    err.textContent = '';
    const body = {
      name: $('pd-name').value, category: $('pd-cat').value, gender: $('pd-gender').value,
      price: Number($('pd-price').value), stock: Number($('pd-stock').value),
      shape: $('pd-shape').value, material: $('pd-material').value, color: $('pd-color').value,
      description: $('pd-desc').value, featured: $('pd-featured').checked
    };
    btn.disabled = true;
    const p = state.curProduct;
    const res = await fetch(p ? '/api/products/' + p.id : '/api/products', {
      method: p ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    btn.disabled = false;
    if (!res.ok) { err.textContent = data.error || 'Could not save the product.'; return; }

    EE.toast(p ? 'Product updated.' : 'Product added. Now upload its photos.');
    state.curProduct = data.product;
    $('pd-title').textContent = `Edit ${data.product.name}`;
    showImages(data.product);
    products();
  });

  // ---------------------- orders ----------------------
  async function orders() {
    panel.innerHTML = '<p class="empty-note">Loading...</p>';
    const data = await api('/api/admin/orders');
    if (!data) { panel.innerHTML = '<p class="empty-note">Could not load orders.</p>'; return; }
    state.orders = data.orders;
    drawOrders();
  }

  function orderTable(list) {
    return `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
      <tbody>
        ${list.map((o) => `
          <tr class="click" data-order="${o.id}" tabindex="0">
            <td><strong>${EE.orderNo(o.id)}</strong></td>
            <td>${EE.esc(o.customer_name)}<br><span class="muted">${EE.esc(o.customer_email)}</span></td>
            <td>${EE.fmtDate(o.created_at)}</td>
            <td class="mono">${o.items.reduce((n, i) => n + i.quantity, 0)}</td>
            <td class="mono">${EE.fmt(o.total)}</td>
            <td>${o.payment_method === 'online' ? 'Online (demo)' : 'COD'}, ${EE.esc(o.payment_status)}</td>
            <td>${statusPill(o.status)}</td>
          </tr>`).join('')}
      </tbody></table></div>`;
  }

  function drawOrders() {
    const q = state.orderQ.toLowerCase();
    const list = state.orders.filter((o) =>
      (!state.orderStatus || o.status === state.orderStatus) &&
      (!q || `${EE.orderNo(o.id)} ${o.customer_name} ${o.customer_email}`.toLowerCase().includes(q)));
    panel.innerHTML = `
      <div class="admin-bar">
        <input id="ord-search" type="search" placeholder="Search by order no, name or email" value="${EE.esc(state.orderQ)}" aria-label="Search orders">
        <select id="ord-filter" aria-label="Filter by status">
          <option value="">All statuses</option>
          ${STATUSES.map((s) => `<option value="${s}"${state.orderStatus === s ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      ${list.length ? orderTable(list) : '<p class="empty-note">No orders match.</p>'}`;
    $('ord-search').addEventListener('input', (e) => {
      state.orderQ = e.target.value;
      const pos = e.target.selectionStart;
      drawOrders();
      const s = $('ord-search'); s.focus(); s.setSelectionRange(pos, pos);
    });
    $('ord-filter').addEventListener('change', (e) => { state.orderStatus = e.target.value; drawOrders(); });
  }

  // Order row pe click (dashboard + orders tab dono mein)
  panel.addEventListener('click', (e) => { const r = e.target.closest('[data-order]'); if (r) openOrder(Number(r.dataset.order)); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const r = e.target.closest('[data-order]'); if (r) openOrder(Number(r.dataset.order)); } });

  const odlg = $('ord-dlg');
  function openOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    const locked = o.status === 'cancelled';
    $('ord-body').innerHTML = `
      <div class="dlg-head"><h2>Order ${EE.orderNo(o.id)}</h2><button type="button" class="link-btn" id="od-close">Close</button></div>
      <p class="muted">Placed on ${EE.fmtDate(o.created_at)} by ${EE.esc(o.customer_name)} (${EE.esc(o.customer_email)})</p>
      <ul class="od-items">
        ${o.items.map((i) => `<li>${thumb(i.image1)}<div><strong>${EE.esc(i.name)}</strong><br><span class="muted">Qty ${i.quantity} at ${EE.fmt(i.price)}</span></div><span class="mono">${EE.fmt(i.price * i.quantity)}</span></li>`).join('')}
      </ul>
      <div class="sum-row total"><span>Total</span><span>${EE.fmt(o.total)}</span></div>
      <div class="two-col tight">
        <div><h3 class="sub">Delivery</h3><p class="addr">${EE.esc(o.shipping_name)}<br>${EE.esc(o.shipping_address)}<br>${EE.esc(o.shipping_city)} ${EE.esc(o.shipping_pincode)}<br>${EE.esc(o.shipping_phone)}</p></div>
        <div><h3 class="sub">Payment</h3><p class="addr">${o.payment_method === 'online' ? 'Online (demo)' : 'Cash on delivery'}<br>Status: ${EE.esc(o.payment_status)}${o.payment_id ? `<br>Ref: ${EE.esc(o.payment_id)}` : ''}</p></div>
      </div>
      <div class="field"><label for="od-status">Order status</label>
        <select id="od-status"${locked ? ' disabled' : ''}>${STATUSES.map((s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <p class="hint">${locked ? 'Cancelled orders cannot be changed.' : 'Cancelling an order puts its items back in stock. Marking a COD order delivered marks it paid.'}</p>
      <div class="dlg-actions"><button class="btn" type="button" id="od-save"${locked ? ' disabled' : ''}>Update status</button></div>`;
    $('od-close').addEventListener('click', () => odlg.close());
    $('od-save').addEventListener('click', async () => {
      const status = $('od-status').value;
      if (status === 'cancelled' && !confirm('Cancel this order? The items go back into stock.')) return;
      const data = await api('/api/admin/orders/' + o.id, 'PUT', { status });
      if (!data) return;
      state.orders = state.orders.map((x) => (x.id === o.id ? data.order : x));
      EE.toast('Order updated.');
      odlg.close();
      if (state.tab === 'orders') drawOrders(); else dashboard();
    });
    if (!odlg.open) odlg.showModal();
  }

  // backdrop pe click se dialog band
  [dlg, odlg].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  setTab(location.hash.slice(1) || 'dashboard');
})();
