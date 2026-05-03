import { ChartFluxo } from './chart-fluxo.js';
import { ChartCompare } from './chart-compare.js';
import { ChartCartoes } from './chart-cartoes.js';
import { ChartPatrimonio } from './chart-patrimonio.js';
import { ChartCategorias } from './chart-categorias.js';

export const ChartManager = {
    instances: { 
        trend: null, 
        reportsFluxo: null, 
        reportsCategoria: null, 
        reportsCompare: null, 
        reportsCartoes: null, 
        reportsPatrimonio: null 
    },
    
    renderAll: (state, dbData) => {
        // Delega o desenho de cada gráfico para a sua respectiva fábrica modular
        ChartFluxo.render(dbData, ChartManager.instances);
        ChartCategorias.renderReportChart(ChartManager.instances);
        ChartCompare.render(state, ChartManager.instances);
        ChartCartoes.render(state, ChartManager.instances);
        ChartPatrimonio.render(state, dbData, ChartManager.instances);
    },

    renderCategoriasPageChart: (db) => {
        // Gráfico específico da aba de Categorias
        ChartCategorias.renderPageChart(db);
    }
};