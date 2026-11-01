// ---------------------------------------------------------------
// checkout.js  ->  address + payment choice + order place
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('checkout-root');
  const user = await EE.requireUser();
  if (!user) return;

  let cart;
  try {
    cart = await (await fetch('/api/cart')).json();
  } catch (e) {
    root.innerHTML = '<p class="empty-note">We could not load your cart. Refresh the page.</p>';
    return;
  }
  EE.setCartCount(cart.count);

  if (!cart.items.length) {
    root.innerHTML = `<div class="empty-state"><p>Your cart is empty.</p><a class="btn" href="/shop.html">Browse frames</a></div>`;
    return;
  }

  root.innerHTML = `
    <div class="cart-layout">
      <form id="co-form" novalidate>
        <section class="panel">
          <h2>Delivery details</h2>
          <div class="field-row">
            <div class="field"><label for="f-name">Full name</label><input id="f-name" autocomplete="name" value="${EE.esc(user.name)}" required></div>
            <div class="field"><label for="f-phone">Phone (10 digits)</label><input id="f-phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="12" required></div>
          </div>
          <div class="field"><label for="f-address">Address</label><input id="f-address" autocomplete="street-address" placeholder="House no, street, area" required></div>
          <div class="field-row">
            <div class="field"><label for="f-city">City</label><input id="f-city" autocomplete="address-level2" required></div>
            <div class="field"><label for="f-pin">Pincode</label><input id="f-pin" inputmode="numeric" autocomplete="postal-code" maxlength="6" required></div>
          </div>
        </section>

        <section class="panel">
          <h2>Payment</h2>
          <label class="pay-opt"><input type="radio" name="pay" value="cod" checked>
            <div><strong>Cash on delivery</strong><span>Pay when your frames arrive.</span></div></label>
          <label class="pay-opt"><input type="radio" name="pay" value="online">
            <div><strong>Pay online (demo)</strong><span>Test payment. No real money is charged.</span></div></label>
        </section>

        <p class="form-error" id="co-error" role="alert"></p>
      </form>

      <aside class="summary" aria-label="Order summary">
        <h2>Order summary</h2>
        <div class="sum-items">
          ${cart.items.map((i) => `<div class="sum-item"><span>${EE.esc(i.name)} x ${i.quantity}</span><span>${EE.fmt(i.lineTotal)}</span></div>`).join('')}
        </div>
        <div class="sum-row"><span>Shipping</span><span>Free</span></div>
        <div class="sum-row total"><span>Total</span><span>${EE.fmt(cart.subtotal)}</span></div>
        <button class="btn" type="submit" form="co-form" id="co-submit">Place order</button>
        <a class="link-btn" href="/cart.html">Back to cart</a>
      </aside>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const err = $('co-error'), btn = $('co-submit');

  $('co-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const body = {
      name: $('f-name').value, phone: $('f-phone').value, address: $('f-address').value,
      city: $('f-city').value, pincode: $('f-pin').value,
      paymentMethod: document.querySelector('input[name="pay"]:checked').value
    };
    btn.disabled = true;
    btn.textContent = 'Placing order...';
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place the order.');
      EE.setCartCount(0);
      location.href = `/order.html?id=${data.id}&new=1`;
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = 'Place order';
    }
  });
})();
