/* ==========================================
   INFIX MEDIA MAIN SCRIPT
   Interactive features, GSAP, and AJAX leads submissions
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Loader Progress Screen Simulation ---
  const loader = document.getElementById('loader');
  const progress = document.getElementById('loader-progress');
  const percentText = document.getElementById('loader-percent');
  let count = 0;

  const timer = setInterval(() => {
    count += Math.floor(Math.random() * 15) + 5;
    if (count >= 100) {
      count = 100;
      clearInterval(timer);
      
      // Animate loader fade out
      setTimeout(() => {
        loader.classList.add('fade-out');
        // Trigger GSAP entrance animations once loader completes
        triggerEntranceAnimations();
      }, 300);
    }
    progress.style.width = count + '%';
    percentText.textContent = count + '%';
  }, 40);


  // --- 2. Custom Cursor Movements ---
  const cursor = document.getElementById('custom-cursor');
  const cursorGlow = document.getElementById('custom-cursor-glow');

  if (cursor && cursorGlow) {
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
      
      // Delay effect for glow circle
      cursorGlow.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`;
    });

    const hoverElements = document.querySelectorAll('a, button, select, input, textarea, .faq-header, .filter-btn, .dot');
    hoverElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('hover');
        cursorGlow.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover');
        cursorGlow.classList.remove('hover');
      });
    });
  }


  // --- 3. Sticky Header Scroll Indicator ---
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('sticky-nav');
    } else {
      header.classList.remove('sticky-nav');
    }
    
    // Update active nav links during scroll
    updateActiveLink();
  });

  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveLink() {
    let scrollPos = window.scrollY + 150;
    
    sections.forEach(section => {
      if (scrollPos >= section.offsetTop && scrollPos < (section.offsetTop + section.offsetHeight)) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + section.getAttribute('id')) {
            link.classList.add('active');
          }
        });
      }
    });
  }


  // --- 4. Mobile Navigation Hamburger ---
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const mobLinks = document.querySelectorAll('.mob-link');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('open');
      document.body.classList.toggle('no-scroll');
    });

    mobLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('open');
        document.body.classList.remove('no-scroll');
      });
    });
  }


  // --- 5. GSAP Entrance Animations ---
  function triggerEntranceAnimations() {
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline();
      
      tl.from('.hero-badge', { opacity: 0, y: -20, duration: 0.8, ease: 'power4.out' })
        .from('.hero-title', { opacity: 0, y: 30, duration: 1, ease: 'power4.out' }, '-=0.5')
        .from('.hero-description', { opacity: 0, y: 20, duration: 0.8, ease: 'power4.out' }, '-=0.6')
        .from('.hero-actions', { opacity: 0, y: 15, duration: 0.8, ease: 'power4.out' }, '-=0.5')
        .from('.hero-stats', { opacity: 0, y: 30, duration: 1, ease: 'power4.out' }, '-=0.4')
        .add(() => {
          // Trigger numbers counter ticking once stats are revealed
          triggerCounters();
        }, '-=0.5');
    } else {
      // Fallback if GSAP fails
      triggerCounters();
    }
  }


  // --- 6. Number Ticking Counters ---
  function triggerCounters() {
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
      const target = +stat.getAttribute('data-target');
      let current = 0;
      const duration = 2000; // 2 seconds
      const stepTime = Math.max(Math.floor(duration / target), 15);
      
      const increment = target / (duration / stepTime);
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          stat.textContent = target;
          clearInterval(timer);
        } else {
          stat.textContent = Math.floor(current);
        }
      }, stepTime);
    });
  }


  // --- 7. Portfolio Filters System ---
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      portfolioCards.forEach(card => {
        const category = card.getAttribute('data-category');
        
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'block';
          setTimeout(() => {
            card.classList.add('show');
          }, 10);
        } else {
          card.classList.remove('show');
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });


  // --- 8. Testimonials Auto Carousel ---
  let slideIndex = 0;
  const slides = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.slider-dots .dot');
  let autoSlideTimer;

  function showSlides() {
    if (slides.length === 0) return;
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    slideIndex++;
    if (slideIndex > slides.length) { slideIndex = 1; }

    slides[slideIndex - 1].classList.add('active');
    dots[slideIndex - 1].classList.add('active');

    autoSlideTimer = setTimeout(showSlides, 5000); // Change image every 5 seconds
  }

  // Set active slide manually
  window.setCurrentSlide = function(n) {
    clearTimeout(autoSlideTimer);
    slideIndex = n;
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    slides[slideIndex].classList.add('active');
    dots[slideIndex].classList.add('active');
    
    // Resume auto play
    autoSlideTimer = setTimeout(showSlides, 6000);
  };

  // Start slider
  if (slides.length > 0) {
    slides[0].classList.add('active');
    dots[0].classList.add('active');
    autoSlideTimer = setTimeout(showSlides, 5000);
  }


  // --- 9. FAQ Accordion Toggles ---
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all items
      faqItems.forEach(i => i.classList.remove('active'));
      
      // If clicked item was not active, open it
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });


  // --- 10. AJAX Inquiry Submissions (POST /contact) ---
  const contactForm = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const successNotif = document.getElementById('form-success');
  const successText = document.getElementById('form-success-text');
  const errorNotif = document.getElementById('form-error');
  const errorText = document.getElementById('form-error-text');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset notifications
      successNotif.style.display = 'none';
      errorNotif.style.display = 'none';

      // Set loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Sending Lead ... <i class="fa-solid fa-spinner fa-spin" style="margin-left: 8px;"></i>`;

      // Gather form inputs
      const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        businessName: document.getElementById('businessName').value,
        service: document.getElementById('service').value,
        budget: document.getElementById('budget').value,
        message: document.getElementById('message').value
      };

      try {
        const response = await fetch('/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          successText.textContent = result.message;
          successNotif.style.display = 'flex';
          contactForm.reset();
        } else {
          errorText.textContent = result.message || 'Something went wrong. Please check your data.';
          errorNotif.style.display = 'flex';
        }
      } catch (err) {
        console.error('Submission failure:', err);
        errorText.textContent = 'Unable to reach the server. Please verify your internet connection or try again later.';
        errorNotif.style.display = 'flex';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Send Message <i class="fa-solid fa-paper-plane" style="margin-left: 8px;"></i>`;
      }
    });
  }
});