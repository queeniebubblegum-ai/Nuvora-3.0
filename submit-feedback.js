// Small, form-local submit feedback state. It never owns business loading logic;
// controllers can keep their existing timers/toasts and only use this helper to
// expose an accessible idle/loading/success state on the submit button.
const originalLabels = new WeakMap();

const getButton = form => form?.querySelector('button[type="submit"]');

export const SubmitFeedback = {
    set: (form, state = 'idle', label = '') => {
        const button = getButton(form);
        if (!button) return;
        if (!originalLabels.has(button)) originalLabels.set(button, button.innerHTML);

        button.dataset.submitState = state;
        button.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
        if (state === 'loading') {
            button.disabled = true;
            button.classList.add('opacity-80', 'cursor-not-allowed');
            button.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> ${label || 'Salvando...'}`;
        } else if (state === 'success') {
            button.disabled = false;
            button.classList.remove('opacity-80', 'cursor-not-allowed');
            button.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> ${label || 'Salvo'}`;
        } else {
            button.disabled = false;
            button.classList.remove('opacity-80', 'cursor-not-allowed');
            button.innerHTML = originalLabels.get(button) || button.innerHTML;
        }
    },
    reset: form => {
        const button = getButton(form);
        if (!button) return;
        SubmitFeedback.set(form, 'idle');
        delete button.dataset.submitState;
        // A modal can change its idle label between openings (for example,
        // receita/despesa). Capture the next loading label afresh.
        originalLabels.delete(button);
    }
};
