import { CoreComponents } from './cmp-core.js';
import { DashboardComponents } from './cmp-dashboard.js';
import { ReportComponents } from './cmp-reports.js';
import { PageComponents } from './cmp-pages.js';

export const Components = {
    ...CoreComponents,
    ...DashboardComponents,
    ...ReportComponents,
    // PageComponents intentionally comes last: its transaction list and filters
    // are the active renderer used by PageRenderers.Transacoes.
    ...PageComponents
};