export const MentorMath = {
    calculateCashflowHealth: (income, expenses) => {
        if (income === 0) return 0;
        const margin = (income - expenses) / income;

        if (margin >= 0.30) return 100;
        if (margin >= 0.15) return 80;
        if (margin >= 0.05) return 60;
        if (margin > 0) return 40;
        return 10;
    },

    calculateReservesHealth: (balance, expenses) => {
        if (expenses === 0 && balance > 0) return 100;
        if (expenses === 0 && balance <= 0) return 0;
        
        const coverageMonths = balance / expenses;

        if (coverageMonths >= 6) return 100; 
        if (coverageMonths >= 3) return 80;  
        if (coverageMonths >= 1) return 60;  
        if (coverageMonths > 0) return 40;   
        return 10;                           
    },

    calculateCreditHealth: (creditUsage, income) => {
        if (income === 0 && creditUsage > 0) return 10;
        if (income === 0 && creditUsage === 0) return 100;
        const ratio = creditUsage / income;

        if (ratio <= 0.15) return 100;
        if (ratio <= 0.30) return 80;
        if (ratio <= 0.50) return 60;
        if (ratio <= 0.70) return 40;
        return 20;
    },

    calculateFutureSecurity: (income, futureCommitments) => {
        if (income === 0 && futureCommitments > 0) return 10;
        if (income === 0 && futureCommitments === 0) return 100;
        
        const ratio = futureCommitments / income;

        if (ratio <= 0.50) return 100; 
        if (ratio <= 1.00) return 80;  
        if (ratio <= 2.00) return 60;  
        if (ratio <= 3.00) return 40;
        return 20;                     
    }
};