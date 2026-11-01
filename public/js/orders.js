// ---------------------------------------------------------------
// orders.js  ->  meri saari orders
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('orders-root');
  if (!(await EE.requireUser())) return;

  try {
    const res = await fetch('/api/orders');
    const { orders } = await res.json();

    if (!orders.length) {
      root.innerHTML = `<div class="empty-state"><p>No orders yet.</p><a class="btn" href="/shop.html">Browse frames</a></div>`;
      return;
    }

    root.innerHTML = `<div class="order-list">${orders.map((o) => {
      const units = o.items.reduce((n, i) => n + i.quantity, 0);
      return `
        <a class="order-card" href="/order.html?id=${o.id}">
          <div class="thumbs-row">
            ${o.items.slice(0, 4).map((i) => `<span class="ph${i.image1 ? '' : ' is-empty'}" style="--ph:${EE.PALETTE[i.productId % EE.PALETTE.length]}">${EE.img(i.image1, i.name, { widths: [160, 240], sizes: '64px' })}</span>`).join('')}
          </div>
          <div class="order-info">
            <strong>${EE.orderNo(o.id)}</strong>
            <span>${EE.fmtDate(o.created_at)}, ${units} ${units === 1 ? 'item' : 'items'}</span>
          </div>
          <div class="order-right">
            <span class="status ${EE.esc(o.status)}">${EE.esc(o.status)}</span>
            <span>${EE.fmt(o.total)}</span>
          </div>
        </a>`;
    }).join('')}</div>`;
  } catch (e) {
    root.innerHTML = '<p class="empty-note">We could not load your orders. Refresh the page.</p>';
  }
})();
