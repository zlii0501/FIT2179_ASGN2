/* --- Animated counter --- */
function animateCounter(el, target, duration = 2000) {
  const start = performance.now();
  const isLarge = target > 1000;
  function step(now) {
    const pct = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - pct, 3);
    const val = Math.round(ease * target);
    el.textContent = isLarge ? val.toLocaleString() : val;
    if (pct < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

window.addEventListener('load', () => {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    animateCounter(el, +el.dataset.target);
  });
});

/* --- Nav dot scrollspy --- */
const sections = ['top', 'ch1', 'ch2', 'ch3', 'ch4'];
const dots = document.querySelectorAll('.nav-dot');

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    const el = document.getElementById(dot.dataset.target);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const idx = sections.indexOf(e.target.id);
      if (idx >= 0) {
        dots.forEach(d => d.classList.remove('active'));
        dots[idx].classList.add('active');
      }
    }
  });
}, { threshold: 0.3 });

sections.forEach(id => {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
});
