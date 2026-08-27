export const STANDARD_SALARY_COMPONENTS = [
  { code: 'HRA', name: 'HRA (House Rent Allowance)', type: 'increment' as const, amountType: 'percentage' as const, defaultAmount: 40, scope: 'post-adjustment' as const },
  { code: 'DA', name: 'DA (Dearness Allowance)', type: 'increment' as const, amountType: 'percentage' as const, defaultAmount: 20, scope: 'post-adjustment' as const },
  { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', type: 'increment' as const, amountType: 'percentage' as const, defaultAmount: 10, scope: 'post-adjustment' as const },
  { code: 'PF', name: 'PF (Provident Fund)', type: 'deduction' as const, amountType: 'percentage' as const, defaultAmount: 12, scope: 'post-adjustment' as const },
  { code: 'PROFESSIONAL_TAX', name: 'Professional Tax', type: 'deduction' as const, amountType: 'fixed' as const, defaultAmount: 200, scope: 'post-adjustment' as const },
  { code: 'TDS', name: 'TDS / Income Tax', type: 'deduction' as const, amountType: 'percentage' as const, defaultAmount: 0, scope: 'post-adjustment' as const }
];
