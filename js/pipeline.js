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

    // Connect step clicks to app views & instant output jump
    const stepCards = document.querySelectorAll('.pipeline-step');
    stepCards.forEach((card) => {
      const handleTrigger = (e) => {
        // Update active step highlight
        stepCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const targetView = card.getAttribute('data-target-view');
        const targetSub = card.getAttribute('data-target-sub');

        if (window.switchView && targetView) {
          window.switchView(targetView);
        } else if (window.predictiqState && window.predictiqState.setView && targetView) {
          window.predictiqState.setView(targetView);
        }

        // If specific sub-element is specified (e.g. drop zone or prep checklist), scroll specifically to it
        if (targetSub) {
          const subEl = document.getElementById(targetSub);
          if (subEl) {
            setTimeout(() => {
              subEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              subEl.classList.add('pipeline-target-highlight');
              setTimeout(() => subEl.classList.remove('pipeline-target-highlight'), 1800);
            }, 80);
          }
        } else if (targetView) {
          const viewEl = document.getElementById(`view-${targetView}`);
          if (viewEl) {
            viewEl.classList.add('pipeline-target-highlight');
            setTimeout(() => viewEl.classList.remove('pipeline-target-highlight'), 1800);
          }
        }
      };

      card.addEventListener('click', handleTrigger);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTrigger(e);
        }
      });
    });
  }
};

window.Pipeline = Pipeline;
