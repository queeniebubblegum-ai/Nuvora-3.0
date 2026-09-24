import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Avenera categories management package (static contracts)', () => {
    it('keeps category creation/edit wired to the existing modal submit contract', () => {
        const modal = read('cmp-modals.js');
        const controller = read('ctrl-contas.js');
        expect(modal).toContain('id="modal-categoria"');
        expect(modal).toContain('data-submit="categoria"');
        expect(modal).toContain('<form data-submit="categoria"');
        expect(modal).toContain('id="nova-categoria-titulo"');
        expect(modal).toContain('data-action="closeModal"');
        expect(modal).toContain('id="nova-categoria-nome" type="text"');
        expect(modal).toContain('id="nova-categoria-nivel"');
        expect(modal).toContain('Categoria principal');
        expect(modal).toContain('Subcategoria');
        expect(modal).toContain('id="nova-categoria-grupo"');
        expect(modal).toContain('id="nova-categoria-id"');
        expect(modal).not.toContain('value="movimentação"');
        expect(controller).toContain('Database.updateCategory');
        expect(controller).toContain("['despesa', 'receita']");
        expect(controller).toContain('Database.getCategoryError');
        expect(read('evt-change.js')).not.toContain("'filterSubgroups'");
    });

    it('protects defaults and keeps their own icon/color fallback explicit', () => {
        const defaults = read('categorias-padrao.js');
        const db = read('db.js');
        const page = read('cmp-pages.js');
        expect(defaults).toContain('cat_padrao_1');
        expect(defaults).toContain('"fixa": true');
        expect(defaults).toContain('isCategoriaPadrao');
        expect(db).toContain('if (isCategoriaPadrao(categoria)) return CategoryRepo._fail');
        expect(db).toContain('_findParent');
        expect(db).toContain('tipoCategoria: nivel');
        expect(db).toContain('paiId');
        expect(db).toContain('Categorias padrão são protegidas');
        expect(db).toContain('archive: (id) =>');
        expect(db).toContain('restore: (id) =>');
        expect(db).toContain('CategoryRepo.usage(id).count');
        expect(page).toContain('Padrão');
        expect(page).toContain('Personalizada');
        expect(page).toContain('data-action="viewCategory"');
        expect(page).not.toContain('data-action="renameCategory"');
        expect(page).toContain('nv-category-row-icon');
    });

    it('renders four summary cards, type/status filters and non-conflicting counters', () => {
        const page = read('cmp-pages.js');
        const app = read('app.js');
        expect(page).toContain('Despesas');
        expect(page).toContain('Receitas');
        expect(page).toContain('Padrão');
        expect(page).toContain('Personalizadas');
        expect(page).toContain('data-action="setCategoryType"');
        expect(page).toContain('data-action="setCategoryStatus"');
        expect(page).toContain('data-group-count="1"');
        expect(app).toContain('visibleCategoryCount');
        expect(app).toContain('visibleGroupCount');
        expect(app).toContain('root.dataset.categoryStatus');
    });

    it('keeps archived categories out of new choices while preserving old values', () => {
        const ui = read('rnd-ui.js');
        const pages = read('cmp-pages.js');
        const changes = read('evt-change.js');
        expect(ui).toContain('const isArchived = c => c && (c.ativo === false || c.arquivada === true)');
        expect(ui).toContain('arquivada · histórico');
        expect(pages).toContain('f.categoria && c.nome === f.categoria');
        expect(changes).toContain('c.ativo !== false && !c.arquivada');
    });

    it('keeps legacy movement records visibly separate and does not add report analytics', () => {
        const page = read('cmp-pages.js');
        const reports = read('rnd-pages.js');
        const charts = read('charts.js');
        expect(page).toContain('Legado · movimentação');
        expect(page).toContain('legacyMovement');
        expect(page).not.toContain('categoriasPageChart');
        expect(reports).not.toContain('categoriasPageChart');
        expect(charts).not.toContain('renderCategoriasPageChart');
    });
});
