export const UtilFinance = {
    formatMoney: (v) => {
        if (isNaN(v)) return 'R$ 0,00';
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    formatBankName: (banco) => {
        if (!banco) return 'Conta Desconhecida';
        const inst = banco.instituicao && banco.instituicao !== 'Outro' ? banco.instituicao : '';
        return inst ? `${inst} - ${banco.nome}` : banco.nome;
    },

    // Nova função de suporte matemático para ser usada nas simulações e lançamentos de crédito no futuro
    calculatePMT: (valorBase, parcelas, jurosMensal) => {
        if (parcelas <= 1 || jurosMensal <= 0) return { pmt: valorBase / parcelas, total: valorBase };
        const taxa = jurosMensal / 100;
        const pmt = valorBase * (taxa / (1 - Math.pow(1 + taxa, -parcelas)));
        return { pmt: pmt, total: pmt * parcelas };
    },

    parseOFX: (ofxString) => {
        const balMatch = ofxString.match(/<LEDGERBAL>[\s\S]*?<BALAMT>(.*?)(?:\r|\n|<|$)/);
        const balance = balMatch ? parseFloat(balMatch[1].replace(',', '.')) : null;

        const dtStartMatch = ofxString.match(/<DTSTART>(.*?)(?:\r|\n|<|$)/);
        const dtEndMatch = ofxString.match(/<DTEND>(.*?)(?:\r|\n|<|$)/);
        
        const parseDate = (raw) => {
            if (!raw) return null;
            const clean = raw.trim();
            if (clean.length >= 8) return `${clean.substring(0,4)}-${clean.substring(4,6)}-${clean.substring(6,8)}`;
            return null;
        };

        const dtStart = parseDate(dtStartMatch ? dtStartMatch[1] : null);
        const dtEnd = parseDate(dtEndMatch ? dtEndMatch[1] : null);

        const transactions = [];
        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
        let match;

        const cleanDescriptionAndMethod = (raw) => {
            let cleaned = raw;
            let method = 'Transferência'; 
            
            if (/pix/i.test(cleaned)) method = 'Pix';
            else if (/cartao|cartão|compra/i.test(cleaned)) method = 'Cartão de Débito';
            else if (/ted|doc/i.test(cleaned)) method = 'Transferência';
            else if (/saque|banco24h/i.test(cleaned)) method = 'Dinheiro';

            cleaned = cleaned.replace(/Transfer[êe]ncia enviada pelo Pix[\s-]*|Transfer[êe]ncia recebida pelo Pix[\s-]*|PIX TRANSF[\s-]*|PIX[\s-]*|COMPRA CARTAO[\s-]*|COMPRA CARTÃO[\s-]*/i, '').trim();

            const parts = cleaned.split(' - ');
            let mainDesc = parts[0].trim();

            if(mainDesc.length > 0) {
                mainDesc = mainDesc.charAt(0).toUpperCase() + mainDesc.slice(1).toLowerCase();
            }

            return { desc: mainDesc || 'Lançamento Bancário', method, rawDetails: raw };
        };
        
        while ((match = trnRegex.exec(ofxString)) !== null) {
            const trnBlock = match[1];
            
            const typeMatch = trnBlock.match(/<TRNTYPE>(.*?)(?:\r|\n|<|$)/);
            const dateMatch = trnBlock.match(/<DTPOSTED>(.*?)(?:\r|\n|<|$)/);
            const amountMatch = trnBlock.match(/<TRNAMT>(.*?)(?:\r|\n|<|$)/);
            const memoMatch = trnBlock.match(/<MEMO>(.*?)(?:\r|\n|<|$)/);
            const nameMatch = trnBlock.match(/<NAME>(.*?)(?:\r|\n|<|$)/);

            let descBanco = '';
            if (nameMatch && nameMatch[1]) descBanco += nameMatch[1].trim();
            if (memoMatch && memoMatch[1]) descBanco += (descBanco ? ' - ' : '') + memoMatch[1].trim();

            const parsedDate = parseDate(dateMatch ? dateMatch[1] : null) || new Date().toISOString().split('T')[0];
            const rawAmount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

            const cleanedData = cleanDescriptionAndMethod(descBanco);

            transactions.push({
                tipo: rawAmount > 0 || (typeMatch && typeMatch[1].trim() === 'CREDIT') ? 'receita' : 'despesa',
                data: parsedDate,
                valor: Math.abs(rawAmount),
                desc: cleanedData.desc,
                formaPagamento: cleanedData.method,
                observacao: cleanedData.rawDetails,
                isOFX: true
            });
        }
        
        return { transactions, dtStart, dtEnd, balance };
    }
};