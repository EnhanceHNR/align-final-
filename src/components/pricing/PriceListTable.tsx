import { Trash2 } from "lucide-react";
type Service = {
  code: string;
  name: string;
  price: number;
};

type Props = {
  services: Service[];
  onDeleteService: (code: string) => void;
};

export default function PriceListTable({
                                         services,
                                         onDeleteService,
                                       }: Props) {

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <table className="w-full">
        <thead className="border-b bg-gray-50">
        <tr className="text-left text-sm text-gray-500">
          <th className="px-6 py-4">Code</th>
          <th className="px-6 py-4">Service</th>
          <th className="px-6 py-4">Price</th>
          <th className="px-6 py-4 text-right">
            Actions
          </th>
        </tr>
        </thead>

        <tbody>
        {services.map((service) => (
          <tr
            key={service.code}
            className="border-b transition hover:bg-gray-50"
          >
            <td className="px-6 py-4 text-gray-600">
              {service.code}
            </td>

            <td className="px-6 py-4 font-medium">
              {service.name}
            </td>

            <td className="px-6 py-4 text-gray-600">
              {service.price} KM
            </td>
            <td className="px-6 py-4 text-right">
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    `Are you sure you want to delete the service "${service.name}"?`
                  );

                  if (confirmed) {
                    onDeleteService(service.code);
                  }
                }}
                className="text-red-500 transition hover:text-red-700"
                title="Delete service"
              >
                <Trash2 size={18} />
              </button>
            </td>
          </tr>
        ))}

        {services.length === 0 && (
          <tr>
            <td
              colSpan={4}
              className="px-6 py-8 text-center text-gray-500"
            >
              No services entered.
            </td>
          </tr>
        )}
        </tbody>
      </table>
    </div>
  );
}