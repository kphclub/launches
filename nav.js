const menuButton = document.getElementById('menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const menuOpenIcon = document.getElementById('menu-open-icon');
const menuCloseIcon = document.getElementById('menu-close-icon');

function setMenuOpen(open) {
  mobileMenu.classList.toggle('hidden', !open);
  menuOpenIcon.classList.toggle('hidden', open);
  menuCloseIcon.classList.toggle('hidden', !open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    setMenuOpen(mobileMenu.classList.contains('hidden'));
  });

  document.addEventListener('click', (event) => {
    if (menuButton.contains(event.target) || mobileMenu.contains(event.target)) return;
    setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenuOpen(false);
  });
}
