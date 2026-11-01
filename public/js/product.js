// ---------------------------------------------------------------
// product.js  ->  single product page (?slug=aria)
// ---------------------------------------------------------------
(function () {
  const root = document.getElementById('product-root');
  const params = new URLSearchParams(location.search);
  const key = params.get('slug') || params.get('id');

  function notFound() {
    document.title = 'Frame not found | Easy Eyes';
    root.innerHTML = `
      <div class="empty-state">
        <p>We could not find that frame.</p>
        <a class="btn btn-dark" href="/shop.html">Back to the shop</a>
      </div>`;
  }

  async function init() {
    if (!key) return notFound();
    try {
      const res = await fetch('/api/products/' + encodeURIComponent(key));
      if (!res.ok) return notFound();
      const { product } = await res.json();
      render(product);
      loadRelated(product);
    } catch (err) {
      root.innerHTML = '<p class="empty-note">We could not load this frame. Check that the server is running and refresh the page.</p>';
    }
  }

  function render(p) {
    document.title = `${p.name} | Easy Eyes`;
    const images = p.images && p.images.length ? p.images : [p.image1, p.image2].filter(Boolean);
    const stock = Number(p.stock);
    const stockLabel = stock <= 0 ? ['out', 'Out of stock'] : stock <= 5 ? ['low', `Only ${stock} left`] : ['', 'In stock'];
    const maxQty = Math.max(1, Math.min(stock, 10));

    root.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="/shop.html">Shop</a> / <a href="/shop.html?category=${encodeURIComponent(p.category)}">${EE.esc(p.category)}</a> / ${EE.esc(p.name)}
      </nav>

      <div class="pdp">
        <div class="gallery">
          <div class="ph gallery-main${images.length ? '' : ' is-empty'}" id="main-media" data-kind="shot">
            ${images.length ? `<img id="main-img" src="${EE.esc(EE.imgUrl(images[0], 800))}" srcset="${EE.esc(EE.imgSet(images[0], [480, 640, 800, 1200]))}" sizes="(max-width: 900px) 100vw, 55vw" alt="${EE.esc(p.name)} frame" decoding="async" fetchpriority="high" onload="imgTrim(this)" onerror="imgFail(this)">` : ''}
            ${images.length > 1 ? '<button type="button" class="g-nav prev" aria-label="Previous image">&larr;</button><button type="button" class="g-nav next" aria-label="Next image">&rarr;</button>' : ''}
          </div>
          ${images.length > 1 ? `
            <div class="thumbs">
              ${images.map((src, i) => `
                <button class="thumb" type="button" data-index="${i}" aria-label="Show image ${i + 1}" aria-current="${i === 0}">
                  <span class="ph">${EE.img(src, '', { widths: [160, 240], sizes: '76px' }).replace('onerror=', 'data-soft="1" onerror=')}</span>
                </button>`).join('')}
            </div>` : ''}
        </div>

        <div class="pdp-info">
          <p class="pdp-cat">${EE.esc(p.category)}</p>
          <h1 class="display pdp-name">${EE.esc(p.name)}</h1>
          <p class="pdp-price">${EE.fmt(p.price)}</p>
          <a class="pdp-rating" id="pdp-rating" href="#reviews" hidden></a>
          <p class="pdp-desc">${EE.esc(p.description)}</p>

          <dl class="specs">
            <div><dt>Frame shape</dt><dd>${EE.esc(p.shape)}</dd></div>
            <div><dt>Material</dt><dd>${EE.esc(p.material)}</dd></div>
            <div><dt>Made for</dt><dd>${EE.esc(p.gender)}</dd></div>
            <div><dt>Colour</dt><dd>${EE.esc(p.color)}</dd></div>
          </dl>

          <p class="stock ${stockLabel[0]}">${stockLabel[1]}</p>

          <div class="buy">
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" id="qty-minus" aria-label="Decrease quantity">&minus;</button>
              <output id="qty" aria-live="polite">1</output>
              <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn" type="button" id="add-btn" ${stock <= 0 ? 'disabled' : ''}>Add to cart</button>
            <button class="btn btn-line" type="button" id="wish-btn" data-wish="${p.id}" data-on="Saved" data-off="Save for later" aria-pressed="false">Save for later</button>
          </div>

          <div>
            <details>
              <summary>Lenses and fit</summary>
              <p>Every lens blocks UV400 light. Eyeglasses and screen glasses can be fitted with your prescription at any optician.</p>
            </details>
            <details>
              <summary>Shipping and returns</summary>
              <p>Free shipping across India. Return any pair within 30 days, unworn and in its case.</p>
            </details>
            <details>
              <summary>Warranty</summary>
              <p>One year against manufacturing defects on every frame.</p>
            </details>
          </div>
        </div>
      </div>

      <section class="reviews" id="reviews" aria-labelledby="rev-title"><div id="rev-root"></div></section>

      <section class="related" id="related" hidden aria-labelledby="related-title">
        <h2 class="display h2" id="related-title">You may also like</h2>
        <div class="grid" id="related-grid"></div>
      </section>`;

    // gallery (kitni bhi photos): thumbnails, arrows, keyboard
    const main = document.getElementById('main-media');
    const thumbs = [...document.querySelectorAll('.thumb')];
    let current = 0;

    function ensureImg() {
      let img = main.querySelector('img');
      if (!img) { // pehli photo missing thi toh remove ho gayi thi, naya bana lo
        img = document.createElement('img');
        img.alt = p.name + ' frame';
        img.setAttribute('onload', 'imgTrim(this)');
        img.setAttribute('onerror', 'imgFail(this)');
        main.prepend(img);
      }
      return img;
    }

    function show(i) {
      if (images.length < 2) return;
      current = (i + images.length) % images.length;
      thumbs.forEach((b, k) => b.setAttribute('aria-current', String(k === current)));
      const img = ensureImg();
      img.style.opacity = 0;
      setTimeout(() => {
        main.classList.remove('is-empty');
        img.classList.remove('trimmed');
        delete img.dataset.trimmed;
        img.removeAttribute('sizes');
        img.srcset = EE.imgSet(images[current], [480, 640, 800, 1200]);
        img.sizes = '(max-width: 900px) 100vw, 55vw';
        img.src = EE.imgUrl(images[current], 800);
        img.style.opacity = 1;
      }, 220);
    }
    thumbs.forEach((b, k) => b.addEventListener('click', () => show(k)));
    const prev = main.querySelector('.g-nav.prev'), next = main.querySelector('.g-nav.next');
    if (prev) prev.addEventListener('click', () => show(current - 1));
    if (next) next.addEventListener('click', () => show(current + 1));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    EE.paintWish();
    EE.initReviews(p.id, document.getElementById('rev-root'));

    // quantity
    let qty = 1;
    const qtyEl = document.getElementById('qty');
    document.getElementById('qty-minus').addEventListener('click', () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; });
    document.getElementById('qty-plus').addEventListener('click', () => { qty = Math.min(maxQty, qty + 1); qtyEl.textContent = qty; });
    document.getElementById('add-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const ok = await EE.addToCart(p.id, qty);
      btn.disabled = false;
      if (ok) {
        btn.textContent = 'Added';
        setTimeout(() => { btn.textContent = 'Add to cart'; }, 1800);
      }
    });
  }

  async function loadRelated(p) {
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(p.category)}&limit=8`);
      const { products } = await res.json();
      const others = products.filter((x) => x.id !== p.id).slice(0, 4);
      if (!others.length) return;
      document.getElementById('related-grid').innerHTML = others.map(EE.productCard).join('');
      document.getElementById('related').hidden = false;
    } catch (e) { /* related section optional hai */ }
  }

  init();
})();
