const parseMoney = (raw) => {
    const text = String(raw ?? '').replace(/R\$\s?/gi, '').replace(/\s/g, '');
    if (!text) return 0;
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
};

const parseDate = (raw) => {
    const value = String(raw ?? '').trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [d, m, y] = value.split('/');
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null;
        return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return null;
};

const splitLine = (line, delimiter) => {
    const cells = []; let cell = ''; let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') { cell += '"'; i++; }
        else if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) { cells.push(cell.trim()); cell = ''; }
        else cell += char;
    }
    cells.push(cell.trim());
    return cells;
};

export const CSVImport = {
    parse: (csv) => {
        const lines = String(csv || '').split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];
        const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
        const headers = splitLine(lines[0], delimiter).map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        const find = names => names.map(n => headers.indexOf(n)).find(i => i >= 0);
        const dateIndex = find(['data', 'date']);
        const valueIndex = find(['valor', 'value', 'amount']);
        const descIndex = find(['descricao', 'description', 'historico', 'memo']);
        const idIndex = find(['identificador', 'id', 'identifier', 'fitid']);
        if (dateIndex === undefined || valueIndex === undefined) throw new Error('CSV precisa ter colunas Data e Valor');
        return lines.slice(1).map(line => {
            const cells = splitLine(line, delimiter);
            const signed = parseMoney(cells[valueIndex]);
            return { data: parseDate(cells[dateIndex]), identificador: idIndex === undefined ? '' : (cells[idIndex] || ''), desc: cells[descIndex] || 'Lançamento importado', valor: Math.abs(signed), tipo: signed >= 0 ? 'receita' : 'despesa', importadoCSV: true };
        }).filter(item => item.data && item.valor > 0);
    }
};
