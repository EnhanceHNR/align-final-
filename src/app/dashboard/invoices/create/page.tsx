import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import InvoiceForm from "@/components/invoices/InvoiceForm";

export default function CreateInvoicePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to invoices
        </Link>

        <InvoiceForm />
      </div>
    </div>
  );
}