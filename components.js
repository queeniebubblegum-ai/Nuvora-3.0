import { CoreComponents } from './cmp-core.js';
import { DashboardComponents } from './cmp-dashboard.js';
import { ReportComponents } from './cmp-reports.js';
import { PageComponents } from './cmp-pages.js';

export const Components = {
    ...CoreComponents,
    ...DashboardComponents,
    ...ReportComponents,
    ...PageComponents
};