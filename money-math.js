// Monetary arithmetic stays in integer centavos internally. Values exposed to
// the rest of the app remain decimal BRL numbers for backward compatibility.
export const toCents = value => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) return 0;

    // Work from Number's shortest decimal representation so common decimal
    // amounts such as 1.005 round symmetrically instead of inheriting binary
    // floating-point artifacts from `value * 100`.
    const negative = numeric < 0;
    const [coefficient, exponentText] = Math.abs(numeric).toString().toLowerCase().split('e');
    const exponent = Number(exponentText || 0);
    const [whole, fraction = ''] = coefficient.split('.');
    const digits = BigInt(`${whole}${fraction}`);
    const scale = 2 + exponent - fraction.length;
    let cents;

    if (scale >= 0) {
        cents = digits * (10n ** BigInt(scale));
    } else {
        const divisor = 10n ** BigInt(-scale);
        const quotient = digits / divisor;
        const remainder = digits % divisor;
        cents = quotient + (remainder * 2n >= divisor ? 1n : 0n);
    }

    const result = Number(negative ? -cents : cents);
    return Number.isFinite(result) ? result : 0;
};

export const fromCents = cents => {
    const numeric = Number(cents);
    return Number.isFinite(numeric) ? numeric / 100 : 0;
};

export const addMoney = (...values) =>
    fromCents(values.reduce((sum, value) => sum + toCents(value), 0));

export const splitInstallments = (total, installments) => {
    const cents = toCents(total);
    const count = Math.max(1, Number.parseInt(installments, 10) || 1);
    const sign = cents < 0 ? -1 : 1;
    const absoluteCents = Math.abs(cents);
    const base = Math.floor(absoluteCents / count);
    const remainder = absoluteCents % count;

    return Array.from({ length: count }, (_, index) =>
        fromCents(sign * (base + (index < remainder ? 1 : 0)))
    );
};
