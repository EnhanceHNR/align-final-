import sys

def fix_bills():
    with open('/Users/sai/Documents/Dental/src/app/dashboard/inventory/bills/page.tsx', 'r') as f:
        content = f.read()

    # Find the start of handleGenerateStatement
    start_idx = content.find("const handleGenerateStatement = async")
    if start_idx != -1:
        # Find the end by looking for "};" at the correct indentation or just finding the next function
        end_idx = content.find("const columns = useMemo(() => {", start_idx)
        if end_idx != -1:
            mock_func = """const handleGenerateStatement = async (dealer: {id: string, name: string}) => {
        setIsGenerating(true);
        setTimeout(() => {
            toast({ title: 'Statement Generated', description: `Statement for ${dealer.name} created.` });
            setSelectedStatementBills([]);
            setIsGenerating(false);
            router.push('/dashboard/inventory/payments');
        }, 1000);
    };

    """
            content = content[:start_idx] + mock_func + content[end_idx:]
            
    with open('/Users/sai/Documents/Dental/src/app/dashboard/inventory/bills/page.tsx', 'w') as f:
        f.write(content)

def fix_payments():
    with open('/Users/sai/Documents/Dental/src/app/dashboard/inventory/payments/page.tsx', 'r') as f:
        content = f.read()

    start_idx = content.find("const handleRecordPayment = async")
    if start_idx != -1:
        end_idx = content.find("const handleViewStatement = (", start_idx)
        if end_idx != -1:
            mock_func = """const handleRecordPayment = async () => {
        setIsRecordingPayment(true);
        setTimeout(() => {
            toast({ title: 'Payment Recorded', description: 'Mock payment recorded successfully.' });
            setIsRecordingPayment(false);
            setPaymentDialogState(prev => ({ ...prev, isOpen: false }));
        }, 1000);
    };

    """
            content = content[:start_idx] + mock_func + content[end_idx:]
            
    with open('/Users/sai/Documents/Dental/src/app/dashboard/inventory/payments/page.tsx', 'w') as f:
        f.write(content)

fix_bills()
fix_payments()
