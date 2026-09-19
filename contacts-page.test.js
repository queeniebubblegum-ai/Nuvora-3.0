import { describe, it, expect } from 'vitest';
import { PageComponents } from './cmp-pages.js';

describe('PageComponents.contatosPage', () => {
    it('renders a contact row with the delegated contact-delete action', () => {
        const html = PageComponents.contatosPage([
            { id: 'contact-1', nome: 'Ana', documento: '12345678900' }
        ]);

        expect(html).toContain('data-action="delete"');
        expect(html).toContain('data-col="contatos"');
        expect(html).toContain('data-id="contact-1"');
        expect(html).toContain('fa-trash-can');
        expect(html).not.toContain('data-col="categorias"');
        expect(html).not.toContain('data-id="${id}"');
    });

    it('keeps the empty state renderable without contact actions', () => {
        const html = PageComponents.contatosPage([]);

        expect(html).toContain('Nenhum contato registrado');
        expect(html).not.toContain('data-col="categorias"');
    });
});
