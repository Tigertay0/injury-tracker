// Applies the saved app theme before first paint to avoid a flash (kept as a file so
// the Content-Security-Policy does not need to allow inline scripts)
try {
  var t = localStorage.getItem('pitchsafe-theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
