import { UtilFinance } from './util-finance.js';
import { UtilDate } from './util-date.js';
import { UtilDOM } from './util-dom.js';

export const Utils = {
    ...UtilFinance,
    ...UtilDate,
    ...UtilDOM
};