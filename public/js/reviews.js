// ---------------------------------------------------------------
// reviews.js  ->  product page ke reviews + rating form
// EE.initReviews(productId, rootElement)
// ---------------------------------------------------------------
(function () {
  EE.initReviews = async function (productId, root) {
    if (!root) return;
    let data = null;
    let rating = 0;

    async function load() {
      try {
        const res = await fetch('/api/reviews/product/' + productId);
        if (!res.ok) throw new Error('bad');
        data = await res.json();
        draw();
        const top = document.getElementById('pdp-rating');
        if (top) {
          top.hidden = !data.summary.count;
          top.textContent = `${EE.stars(data.summary.avg)}  ${data.summary.avg.toFixed(1)} (${data.summary.count} ${data.summary.count === 1 ? 'review' : 'reviews'})`;
        }
      } catch (e) {
        root.innerHTML = '<p class="empty-note">We could not load reviews.</p>';
      }
    }

    function draw() {
      const { summary, reviews } = data;
      const user = EE.user;
      const mine = user ? reviews.find((r) => r.userId === user.id) : null;
      rating = mine ? mine.rating : rating;

      const bars = summary.count ? `
        <ul class="rev-bars" aria-label="Rating breakdown">
          ${[5, 4, 3, 2, 1].map((n) => `<li><span>${n} ★</span><span class="bar"><i style="width:${Math.round((summary.counts[n] / summary.count) * 100)}%"></i></span><span>${summary.counts[n]}</span></li>`).join('')}
        </ul>` : '';

      const form = user ? `
        <form class="panel" id="rev-form" novalidate>
          <h3 class="sub">${mine ? 'Update your review' : 'Write a review'}</h3>
          <div class="star-input" role="radiogroup" aria-label="Your rating">
            ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" data-v="${n}" aria-label="${n} star${n > 1 ? 's' : ''}" aria-checked="${rating === n}" class="${n <= rating ? 'on' : ''}">★</button>`).join('')}
          </div>
          <div class="field"><label for="rev-comment">Your review (optional)</label>
            <textarea id="rev-comment" rows="3" maxlength="1000" placeholder="How do they fit and feel?">${EE.esc(mine ? mine.comment : '')}</textarea></div>
          <p class="form-error" id="rev-error" role="alert"></p>
          <div class="dlg-actions" style="justify-content:space-between;align-items:center">
            ${mine ? '<button type="button" class="link-btn danger" id="rev-del">Delete my review</button>' : '<span></span>'}
            <button class="btn" type="submit">${mine ? 'Update review' : 'Post review'}</button>
          </div>
        </form>`
        : `<div class="panel"><h3 class="sub">Write a review</h3><p class="hint">Log in to rate this frame.</p><a class="btn" href="/login.html?next=${encodeURIComponent(location.pathname + location.search)}">Log in</a></div>`;

      root.innerHTML = `
        <div class="rev-head">
          <h2 class="display h2" id="rev-title">Reviews</h2>
          ${summary.count ? `<div class="rev-score"><strong>${summary.avg.toFixed(1)}</strong><span class="stars" aria-hidden="true">${EE.stars(summary.avg)}</span><em>${summary.count} ${summary.count === 1 ? 'review' : 'reviews'}</em></div>` : ''}
        </div>
        <div class="rev-layout">
          <div class="rev-side">${bars}${form}</div>
          <ul class="rev-list">
            ${reviews.length ? reviews.map((r) => `
              <li class="rev-item">
                <div class="rev-line"><span class="stars" aria-label="${r.rating} out of 5">${EE.stars(r.rating)}</span><strong>${EE.esc(r.name)}</strong>${r.verified ? '<span class="verified">Verified purchase</span>' : ''}<span class="muted">${EE.fmtDate(r.created_at)}</span></div>
                ${r.comment ? `<p>${EE.esc(r.comment)}</p>` : ''}
              </li>`).join('') : '<li class="empty-note">No reviews yet. Be the first to rate this frame.</li>'}
          </ul>
        </div>`;

      const f = document.getElementById('rev-form');
      if (!f) return;
      f.querySelector('.star-input').addEventListener('click', (e) => {
        const b = e.target.closest('[data-v]');
        if (!b) return;
        rating = Number(b.dataset.v);
        f.querySelectorAll('.star-input button').forEach((x) => {
          const on = Number(x.dataset.v) <= rating;
          x.classList.toggle('on', on);
          x.setAttribute('aria-checked', String(Number(x.dataset.v) === rating));
        });
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = document.getElementById('rev-error');
        err.textContent = '';
        if (!rating) { err.textContent = 'Please choose a star rating.'; return; }
        const res = await fetch('/api/reviews/product/' + productId, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment: document.getElementById('rev-comment').value })
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) { err.textContent = out.error || 'Could not post your review.'; return; }
        EE.toast(mine ? 'Review updated.' : 'Thanks for your review.');
        await load();
      });
      const del = document.getElementById('rev-del');
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Delete your review?')) return;
        await fetch('/api/reviews/product/' + productId, { method: 'DELETE' });
        rating = 0;
        EE.toast('Review deleted.');
        await load();
      });
    }

    await EE.userReady; // pehle pata chale user logged in hai ya nahi
    load();
  };
})();
