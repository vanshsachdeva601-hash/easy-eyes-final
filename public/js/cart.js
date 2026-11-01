// ---------------------------------------------------------------
// cart.js  ->  cart page (quantity badlo, remove karo, checkout pe jao)
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('cart-root');
  if (!(await EE.requireUser())) return;

  let cart = { items: [], subtotal: 0, count: 0 };

  const row = (i) => `
    <li class="cart-row" data-id="${i.productId}">
      <a class="ph${i.image1 ? '' : ' is-empty'}" href="/product.html?slug=${encodeURIComponent(i.slug)}"
         style="--ph:${EE.PALETTE[i.productId % EE.PALETTE.length]}" aria-label="${EE.esc(i.name)}">${EE.img(i.image1, i.name, { widths: [160, 240, 320], sizes: '110px' })}</a>
      <div>
        <a class="cart-name" href="/product.html?slug=${encodeURIComponent(i.slug)}">${EE.esc(i.name)}</a>
        <p class="cart-meta">${EE.esc(i.category)}, ${EE.esc(i.color || '')}</p>
        ${i.quantity > i.stock ? `<p class="form-error">Only ${i.stock} left in stock. Please lower the quantity.</p>` : ''}
        <button class="rm" type="button" data-action="remove">Remove</button>
      </div>
      <div class="cart-side">
        <div class="qty small" role="group" aria-label="Quantity for ${EE.esc(i.name)}">
          <button type="button" data-action="dec" aria-label="Decrease quantity">&minus;</button>
          <output>${i.quantity}</output>
          <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
        </div>
        <span class="cart-line">${EE.fmt(i.lineTotal)}</span>
      </div>
    </li>`;

  function render() {
    EE.setCartCount(cart.count);
    if (!cart.items.length) {
      root.innerHTML = `
        <div class="empty-state">
          <p>Your cart is empty.</p>
          <a class="btn" href="/shop.html">Browse frames</a>
        </div>`;
      return;
    }
    const blocked = cart.items.some((i) => i.quantity > i.stock);
    root.innerHTML = `
      <div class="cart-layout">
        <ul class="cart-list">${cart.items.map(row).join('')}</ul>
        <aside class="summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <div class="sum-row"><span>Subtotal (${cart.count} ${cart.count === 1 ? 'item' : 'items'})</span><span>${EE.fmt(cart.subtotal)}</span></div>
          <div class="sum-row"><span>Shipping</span><span>Free</span></div>
          <div class="sum-row total"><span>Total</span><span>${EE.fmt(cart.subtotal)}</span></div>
          <a class="btn" href="/checkout.html"${blocked ? ' aria-disabled="true" style="pointer-events:none;opacity:.4"' : ''}>Checkout</a>
          <a class="link-btn" href="/shop.html">Continue shopping</a>
        </aside>
      </div>`;
  }

  async function api(url, method, body) {
    const res = await fetch(url, {
      method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) { EE.toast(data.error || 'Something went wrong.'); return false; }
    cart = data;
    return true;
  }

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.closest('.cart-row').dataset.id);
    const item = cart.items.find((i) => i.productId === id);
    if (!item) return;
    const action = btn.dataset.action;

    if (action === 'remove') await api('/api/cart/' + id, 'DELETE');
    else if (action === 'inc') await api('/api/cart/' + id, 'PUT', { quantity: item.quantity + 1 });
    else if (action === 'dec') {
      if (item.quantity <= 1) await api('/api/cart/' + id, 'DELETE');
      else await api('/api/cart/' + id, 'PUT', { quantity: item.quantity - 1 });
    }
    render();
  });

  try {
    const res = await fetch('/api/cart');
    cart = await res.json();
    render();
  } catch (e) {
    root.innerHTML = '<p class="empty-note">We could not load your cart. Check that the server is running and refresh.</p>';
  }
})();
