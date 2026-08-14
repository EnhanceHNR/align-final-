import type { Invoice } from "@/types/invoice";
import InvoiceActions from "./InvoiceActions";
type Props = {
  invoice: Invoice;
  invoiceId?: string;
};

const statusLabels = {
  draft: "Draft",
  paid: "Paid",
  unpaid: "Unpaid",
};

export default function InvoicePreview({ invoice, invoiceId }: Props) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-2xl font-semibold">
        Invoice No. {invoice.id}
      </h2>

      <div className="mb-6 space-y-2">
        <p>
          <span className="font-medium">Patient:</span>{" "}
          {invoice.patientName}
        </p>

        <p>
          <span className="font-medium">Date:</span>{" "}
          {new Date(invoice.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </p>

        <p>
          <span className="font-medium">Status:</span>{" "}
          {
            statusLabels[
              invoice.status as keyof typeof statusLabels
              ]
          }
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-medium">
          Invoice items
        </h3>

        <table className="w-full">
          <thead>
          <tr className="border-b text-left">
            <th className="py-2">Service</th>
            <th className="py-2">Quantity</th>
            <th className="py-2">Price</th>
          </tr>
          </thead>

          <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-3">
                {item.serviceName}
              </td>

              <td className="py-3">
                {item.quantity}
              </td>

              <td className="py-3">
                {item.price} KM
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-right space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{invoice.subtotal ? invoice.subtotal.toFixed(2) : (invoice.total / 1.17).toFixed(2)} KM</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>VAT (17%):</span>
          <span>{invoice.taxAmount ? invoice.taxAmount.toFixed(2) : (invoice.total * 0.17).toFixed(2)} KM</span>
        </div>
        <div className="border-t pt-2">
          <h2 className="text-2xl font-bold">
            Total: {invoice.total.toFixed(2)} KM
          </h2>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <InvoiceActions invoiceId={invoiceId} />
      </div>
    </div>


  );
}