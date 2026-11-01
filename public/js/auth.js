// ---------------------------------------------------------------
// auth.js  ->  login + signup (ek hi page, do tabs)
// ?next=/cart.html ho toh login ke baad wahin wapas bhejta hai
// ---------------------------------------------------------------
(function () {
  const params = new URLSearchParams(location.search);
  const rawNext = params.get('next') || '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  let mode = params.get('mode') === 'signup' ? 'signup' : 'login';

  const $ = (id) => document.getElementById(id);
  const form = $('auth-form'), err = $('auth-error'), submit = $('auth-submit');

  function setMode(m) {
    mode = m;
    const signup = m === 'signup';
    $('tab-login').setAttribute('aria-selected', String(!signup));
    $('tab-signup').setAttribute('aria-selected', String(signup));
    $('name-field').hidden = !signup;
    $('a-name').disabled = !signup;
    $('a-pass').autocomplete = signup ? 'new-password' : 'current-password';
    $('auth-title').textContent = signup ? 'Create your account' : 'Welcome back';
    submit.textContent = signup ? 'Create account' : 'Log in';
    document.title = (signup ? 'Sign up' : 'Log in') + ' | Easy Eyes';
    err.textContent = '';
  }
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-signup').addEventListener('click', () => setMode('signup'));
  setMode(mode);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const body = { email: $('a-email').value.trim(), password: $('a-pass').value };
    if (mode === 'signup') body.name = $('a-name').value.trim();

    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Please wait...';
    try {
      const res = await fetch('/api/auth/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      location.href = next;
    } catch (ex) {
      err.textContent = ex.message;
      submit.disabled = false;
      submit.textContent = label;
    }
  });

  // Pehle se logged in ho toh seedha aage bhej do
  EE.userReady.then((u) => { if (u) location.replace(next); });
})();
