import { addMoney, fromCents, toCents } from './money-math.js';

export const shouldAnchorImportedTransactionsToStatementBalance = ({
    importType,
    balanceConfirmed,
    statementBalance,
} = {}) => {
    if (importType !== 'OFX' || balanceConfirmed !== true || statementBalance === null || statementBalance === undefined || statementBalance === '') return false;
    return Number.isFinite(Number(statementBalance));
};

export const statementBalanceAnchorMetadata = options => shouldAnchorImportedTransactionsToStatementBalance(options)
    ? { saldoIncluidoNoSaldoDoExtrato: true }
    : {};

export const normalizeStatementBalance = value => fromCents(toCents(value));

export const statementBalanceAdjustment = (newBalance, oldBalance) =>
    addMoney(normalizeStatementBalance(newBalance), -normalizeStatementBalance(oldBalance));

export const reverseStatementBalanceAdjustment = ({ currentBalance, adjustment } = {}) =>
    addMoney(normalizeStatementBalance(currentBalance), -normalizeStatementBalance(adjustment));
