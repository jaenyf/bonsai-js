// Mobile hamburger menu toggle
const hamburger = document.querySelector('.nav-hamburger')
const navLinks = document.querySelector('.nav-links')

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const expanded = hamburger.getAttribute('aria-expanded') === 'true'
    hamburger.setAttribute('aria-expanded', String(!expanded))
    navLinks.classList.toggle('open')
  })

  // Close menu when a link is tapped
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      hamburger.setAttribute('aria-expanded', 'false')
      navLinks.classList.remove('open')
    }
  })
}
