import { Button } from "@/components/ui/button";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

type Props = {
  invoiceId?: string;
};

export default function InvoiceActions({ invoiceId }: Props) {
  const router = useRouter();
  const markAsPaid = api.invoice.markAsPaid.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleMarkAsPaid = () => {
    if (!invoiceId) return;
    markAsPaid.mutate({ id: invoiceId });
  };

  const handleDownloadPDF = () => {
    if (!invoiceId) return;
    // This will be implemented with the PDF generation endpoint
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  return (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={handleDownloadPDF}
        disabled={!invoiceId}
      >
        Download PDF
      </Button>

      <Button
        onClick={handleMarkAsPaid}
        disabled={!invoiceId || markAsPaid.isPending}
      >
        {markAsPaid.isPending ? "Marking..." : "Mark as paid"}
      </Button>
    </div>
  );
}