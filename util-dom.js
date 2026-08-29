export const UtilDOM = {
    escapeHTML: (str) => {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    },

    html: (strings, ...values) => {
        return strings.reduce((acc, str, i) => {
            const val = values[i - 1];
            const safeVal = (val === null || val === undefined) ? '' :
                            (Array.isArray(val) ? val.join('') : UtilDOM.escapeHTML(val));
            return acc + safeVal + str;
        });
    },

    showToast: (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        if(!container) return;
        const toast = document.createElement('div');
        
        const isError = type === 'error';
        const bgColor = isError ? 'bg-[#E11D48] text-white' : 'bg-surface border border-border text-text-primary';
        const iconColor = isError ? 'text-white' : 'text-success';
        const icon = isError ? 'fa-circle-exclamation' : 'fa-circle-check';
        
        toast.className = `pointer-events-auto w-full sm:w-auto max-w-full flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-2xl font-semibold text-sm transition-all transform duration-300 translate-y-[20px] opacity-0 cursor-pointer ${bgColor}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('title', 'Clique para fechar');
        toast.innerHTML = `<i class="fa-solid ${icon} ${iconColor} text-lg shrink-0"></i><span class="min-w-0 break-words">${UtilDOM.escapeHTML(msg)}</span><button type="button" aria-label="Fechar aviso" class="ml-auto shrink-0 opacity-70 hover:opacity-100"><i class="fa-solid fa-xmark"></i></button>`;
        const remove = () => { toast.classList.add('opacity-0', 'translate-y-[20px]'); setTimeout(() => toast.remove(), 300); };
        toast.addEventListener('click', remove);
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    morphDOM: (targetNode, newHTML) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;

        const updateNode = (oldNode, newNode) => {
            if (!oldNode || !newNode) return;
            
            if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName) {
                oldNode.replaceWith(newNode.cloneNode(true));
                return;
            }
            
            if (oldNode.nodeType === Node.TEXT_NODE) {
                if (oldNode.textContent !== newNode.textContent) {
                    oldNode.textContent = newNode.textContent;
                }
                return;
            }

            const oldAttrs = oldNode.attributes;
            const newAttrs = newNode.attributes;
            if (oldAttrs && newAttrs) {
                for (let i = oldAttrs.length - 1; i >= 0; i--) {
                    const name = oldAttrs[i].name;
                    if (!newNode.hasAttribute(name)) oldNode.removeAttribute(name);
                }
                for (let i = 0; i < newAttrs.length; i++) {
                    const name = newAttrs[i].name;
                    const val = newAttrs[i].value;
                    if (oldNode.getAttribute(name) !== val) {
                        oldNode.setAttribute(name, val);
                    }
                }
            }

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(oldNode.tagName)) {
                if (oldNode.value !== newNode.value) oldNode.value = newNode.value;
                if (oldNode.checked !== newNode.checked) oldNode.checked = newNode.checked;
            }

            const oldChildren = Array.from(oldNode.childNodes);
            const newChildren = Array.from(newNode.childNodes);
            
            const keyedOld = {};
            oldChildren.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE && child.hasAttribute('data-key')) {
                    keyedOld[child.getAttribute('data-key')] = child;
                }
            });

            for (let i = 0; i < newChildren.length; i++) {
                const newChild = newChildren[i];
                const key = newChild.nodeType === Node.ELEMENT_NODE ? newChild.getAttribute('data-key') : null;
                let oldChild = oldChildren[i];

                if (key && keyedOld[key]) {
                    const matchedOldChild = keyedOld[key];
                    if (matchedOldChild !== oldChild) {
                        oldNode.insertBefore(matchedOldChild, oldChild || null);
                        const currentIndex = oldChildren.indexOf(matchedOldChild);
                        oldChildren.splice(currentIndex, 1);
                        oldChildren.splice(i, 0, matchedOldChild);
                        oldChild = matchedOldChild;
                    }
                }

                if (!oldChild) {
                    oldNode.appendChild(newChild.cloneNode(true));
                } else {
                    updateNode(oldChild, newChild);
                }
            }

            while (oldNode.childNodes.length > newChildren.length) {
                oldNode.removeChild(oldNode.lastChild);
            }
        };

        const oldChildren = Array.from(targetNode.childNodes);
        const newChildren = Array.from(tempDiv.childNodes);
        const max = Math.max(oldChildren.length, newChildren.length);
        
        for (let i = 0; i < max; i++) {
            if (!oldChildren[i] && newChildren[i]) {
                targetNode.appendChild(newChildren[i].cloneNode(true));
            } else if (oldChildren[i] && !newChildren[i]) {
                targetNode.removeChild(oldChildren[i]);
            } else {
                updateNode(oldChildren[i], newChildren[i]);
            }
        }
    }
};