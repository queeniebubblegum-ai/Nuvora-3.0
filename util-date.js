export const parseLocalDate = value => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
    if (typeof value === 'number') {
        const numericDate = new Date(value);
        return Number.isNaN(numericDate.getTime()) ? null : numericDate;
    }

    const raw = String(value).trim();
    if (!raw) return null;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (dateOnly) {
        const year = Number(dateOnly[1]);
        const month = Number(dateOnly[2]);
        const day = Number(dateOnly[3]);
        const localDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) return null;
        return localDate;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const UtilDate = {
    parseLocalDate,
    localISODate: () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now - offset).toISOString().split('T')[0];
    },

    formatToBR: (isoString) => {
        if (!isoString) return '--/--/----';
        const [y, m, d] = isoString.split('-');
        if (!y || !m || !d) return isoString;
        return `${d}/${m}/${y}`;
    },

    getDaysBetween: (date1, date2) => {
        const d1 = parseLocalDate(date1);
        const d2 = parseLocalDate(date2);
        if (!d1 || !d2) return NaN;
        d1.setHours(0,0,0,0);
        d2.setHours(0,0,0,0);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    addMonthsSafe: (dateISO, monthsToAdd) => {
        const date = new Date(dateISO + 'T12:00:00');
        const expectedMonth = (((date.getMonth() + monthsToAdd) % 12) + 12) % 12;
        date.setMonth(date.getMonth() + monthsToAdd);

        // Evita saltar meses (ex: 31 de Janeiro + 1 mês = 3 de Março -> corrige para 28 de Fev)
        if (date.getMonth() !== expectedMonth) {
            date.setDate(0);
        }
        return date.toISOString().split('T')[0];
    }
};
