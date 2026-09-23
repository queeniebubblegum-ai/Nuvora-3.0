// Shared delegated-submit guard. It locks the form for the duration of the
// current handler and can be kept across callback-based async work with hold().
// The lock is intentionally scoped to the form rather than globally: unrelated
// financial forms can still be submitted while one modal is saving.
const states = new WeakMap();

const mark = (form, state) => {
    if (!form) return;
    if (state) {
        form.dataset.submitLocked = 'true';
    } else {
        delete form.dataset.submitLocked;
    }
};

export const SubmitGuard = {
    begin: (form) => {
        if (!form || states.get(form)?.locked || form.dataset.submitLocked === 'true') return false;
        const state = { locked: true, hold: false };
        states.set(form, state);
        mark(form, true);
        return true;
    },
    hold: (form) => {
        const state = states.get(form);
        if (state) state.hold = true;
    },
    release: (form) => {
        if (!form) return;
        states.delete(form);
        mark(form, false);
    },
    cancel: (form) => {
        const state = states.get(form);
        if (!state) return;
        // A close/reset cannot cancel an in-flight callback save. Its owning
        // controller still releases the held lock; synchronous modal actions
        // get the same finite double-click window as run().
        if (state.hold) return;
        setTimeout(() => SubmitGuard.release(form), 250);
    },
    isLocked: form => Boolean(form && (states.get(form)?.locked || form.dataset.submitLocked === 'true')),
    run: (form, handler) => {
        if (!SubmitGuard.begin(form)) return false;
        let result;
        try {
            result = handler();
        } catch (error) {
            SubmitGuard.release(form);
            throw error;
        }
        if (result && typeof result.then === 'function') {
            return result.then(value => { SubmitGuard.release(form); return value; }, error => {
                SubmitGuard.release(form);
                throw error;
            });
        }
        const state = states.get(form);
        if (!state?.hold) {
            // Synchronous controllers still get a short double-click window;
            // the timer is finite and does not own the button's loading state.
            setTimeout(() => SubmitGuard.release(form), 250);
        }
        return true;
    }
};
