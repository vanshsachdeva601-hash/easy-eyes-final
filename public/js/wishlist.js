// ---------------------------------------------------------------
// wishlist.js  ->  saved frames ka page
// ---------------------------------------------------------------
(async function () {
  const root = document.getElementById('wish-root');
  if (!(await EE.requireUser())) return;

  const empty = () => {
    root.innerHTML = `<div class="empty-state"><p>Nothing saved yet.</p><a class="btn" href="/shop.html">Browse frames</a></div>`;
  };

  try {
    const res = await fetch('/api/wishlist');
    const { products } = await res.json();
    EE.wishSet = new Set(products.map((p) => p.id));
    if (!products.length) return empty();
    root.innerHTML = `<div class="grid" id="wish-grid" style="margin-top:30px">${products.map(EE.productCard).join('')}</div>`;
    EE.paintWish();
  } catch (e) {
    root.innerHTML = '<p class="empty-note">We could not load your wishlist. Refresh the page.</p>';
    return;
  }

  // Heart hatane pe card bhi hata do
  document.addEventListener('ee:wish', (e) => {
    if (e.detail.on) return;
    const heart = document.querySelector(`#wish-grid [data-wish="${e.detail.id}"]`);
    if (heart) heart.closest('.card-wrap').remove();
    if (!document.querySelector('#wish-grid .card-wrap')) empty();
  });
})();
