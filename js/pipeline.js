/**
 * PredictIQ Pipeline Reveal Module
 * Manages the one orchestrated pipeline reveal (Data -> Clean -> Train -> Predict -> Decide)
 * Strictly respects prefers-reduced-motion.
 */

const Pipeline = {
  init() {
    const pipelineContainer = document.getElementById('pipeline-section');
    if (!pipelineContainer) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pathEl = document.getElementById('pipeline-anim-path');
    if (pathEl) {
      if (prefersReducedMotion) {
        pathEl.classList.remove('pipeline-path-animated');
        pathEl.style.strokeDashoffset = '0';
      } else {
        // Use IntersectionObserver to draw the line once upon scrolling into view
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              pathEl.classList.add('pipeline-path-animated');
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.2 });

        observer.observe(pipelineContainer);
      }
    }

    // Connect step clicks to app views
    const stepCards = document.querySelectorAll('.pipeline-step');
    stepCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const targetView = card.getAttribute('data-target-view');
        if (targetView && window.predictiqState) {
          window.predictiqState.setView(targetView);
        }
      });
    });
  }
};

window.Pipeline = Pipeline;
