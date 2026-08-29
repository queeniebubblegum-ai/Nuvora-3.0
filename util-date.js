export const UtilDate = {
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
        const d1 = new Date(date1);
        const d2 = new Date(date2);
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