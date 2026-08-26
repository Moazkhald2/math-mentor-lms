// Apply saved theme before first paint (prevents flash).
// External file so CSP 'self' allows it (inline scripts are blocked).
try {
  var t = localStorage.getItem('tmm-theme');
  document.documentElement.dataset.theme = t === 'dark' ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
