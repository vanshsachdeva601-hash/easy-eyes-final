// ---------------------------------------------------------------
// order.js  ->  ek order ki detail / confirmation (?id=5&new=1)
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('order-root');
  if (!(await EE.requireUser())) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const isNew = params.get('new') === '1';

  try {
    const res = await fetch('/api/orders/' + encodeURIComponent(id || ''));
    if (!res.ok) throw new Error('missing');
    const { order: o } = await res.json();
    document.title = `Order ${EE.orderNo(o.id)} | Easy Eyes`;

    const payLabel = o.payment_method === 'online'
      ? (o.payment_status === 'paid' ? `Paid online (demo), ref ${EE.esc(o.payment_id || '')}` : 'Online payment')
      : 'Cash on delivery';

    root.innerHTML = `
      <div class="order-top">
        <div>
          <h1 class="display page-title">${isNew ? 'Thank you.' : 'Order ' + EE.orderNo(o.id)}</h1>
          <p>${isNew ? `Your order ${EE.orderNo(o.id)} is placed. We will pack your frames and update the status here.` : `Placed on ${EE.fmtDate(o.created_at)}`}</p>
        </div>
        <span class="status ${EE.esc(o.status)}">${EE.esc(o.status)}</span>
      </div>

      <div class="cart-layout">
        <ul class="cart-list">
          ${o.items.map((i) => `
            <li class="cart-row">
              <a class="ph${i.image1 ? '' : ' is-empty'}" href="/product.html?slug=${encodeURIComponent(i.slug)}"
                 style="--ph:${EE.PALETTE[i.productId % EE.PALETTE.length]}" aria-label="${EE.esc(i.name)}">${EE.img(i.image1, i.name, { widths: [160, 240, 320], sizes: '110px' })}</a>
              <div>
                <a class="cart-name" href="/product.html?slug=${encodeURIComponent(i.slug)}">${EE.esc(i.name)}</a>
                <p class="cart-meta">Qty ${i.quantity} at ${EE.fmt(i.price)}</p>
              </div>
              <div class="cart-side"><span class="cart-line">${EE.fmt(i.price * i.quantity)}</span></div>
            </li>`).join('')}
        </ul>

        <aside>
          <section class="panel">
            <h2>Summary</h2>
            <div class="sum-row"><span>Shipping</span><span>Free</span></div>
            <div class="sum-row total"><span>Total</span><span>${EE.fmt(o.total)}</span></div>
            <div class="sum-row"><span>Payment</span><span style="text-align:right;max-width:60%">${payLabel}</span></div>
          </section>
          <section class="panel">
            <h2>Delivering to</h2>
            <p class="addr">${EE.esc(o.shipping_name)}<br>${EE.esc(o.shipping_address)}<br>${EE.esc(o.shipping_city)} ${EE.esc(o.shipping_pincode)}<br>${EE.esc(o.shipping_phone)}</p>
          </section>
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
            <a class="btn" href="/shop.html">Continue shopping</a>
            <a class="btn btn-line" href="/orders.html">All orders</a>
          </div>
        </aside>
      </div>`;
  } catch (e) {
    root.innerHTML = `<div class="empty-state"><p>We could not find that order.</p><a class="btn" href="/orders.html">My orders</a></div>`;
  }
})();
