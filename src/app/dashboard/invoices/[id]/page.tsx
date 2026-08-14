"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import InvoicePreview from "@/components/invoices/InvoicePreview";
import { api } from "~/trpc/react";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PAID: "Paid",
  UNPAID: "Unpaid",
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading, error } = api.invoice.getById.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back to invoices
          </Link>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-center text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Back to invoices
          </Link>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-center text-red-500">
              Error loading invoice.
            </p>
          </div>
        </div>
      </div>
    );
  }
  const transformedInvoice = {
    id: invoice.invoiceNumber,
    patientName: invoice.patient.fullName,
    date: invoice.createdAt.toISOString(),
    status: invoice.status.toLowerCase() as "draft" | "paid" | "unpaid",
    subtotal: (invoice as any).subtotal,
    taxAmount: (invoice as any).taxAmount,
    taxRate: (invoice as any).taxRate,
    total: invoice.totalAmount,
    items: invoice.items.map((item: any) => ({
      id: item.id,
      serviceName: item.serviceName,
      quantity: item.quantity,
      price: item.unitPrice || 0,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to invoices
        </Link>

        <InvoicePreview invoice={transformedInvoice} invoiceId={invoice.id} />
      </div>
    </div>
  );
}