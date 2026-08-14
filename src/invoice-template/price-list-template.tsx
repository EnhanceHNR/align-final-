import Image from "next/image";

type Service = {
  code: string;
  name: string;
  price: number;
};

type Props = {
  services: Service[];
};

export default function PriceListTemplate({
                                            services,
                                          }: Props) {
  return (
    <div className="bg-gray-100 py-10">
      <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-10 shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20">
              <Image
                src="/clinic-logo-v3.png"
                alt="City Dent Logo"
                fill
                priority
                className="object-contain"
              />
            </div>

            <div>
              <p className="text-sm text-gray-600">
                Private dental clinic
              </p>

              <h1 className="text-xl font-bold tracking-wide text-gray-900">
                CITY DENT
              </h1>



              <p className="mt-1 text-sm text-gray-500">
                Dr. Erdin Tatarević
              </p>
            </div>
          </div>

          <div className="text-right text-sm text-gray-600">
            <p>Višnjik 34 B</p>
            <p>Sarajevo</p>
          </div>
        </div>

        {/* Title */}
        <div className="my-6 text-center">
          <h2 className="text-3xl font-bold tracking-wide text-gray-900">
            PRICE LIST OF SERVICES
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-300">
          <table className="w-full border-collapse text-sm">
            <thead>
            <tr className="bg-[#0B2A78] text-white">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                Code
              </th>

              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                Service name
              </th>

              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                Price (KM)
              </th>
            </tr>
            </thead>

            <tbody>
            {services.map((service) => (
              <tr key={service.code}>
                <td className="border border-gray-200 px-4 py-4">
                  {service.code}
                </td>

                <td className="border border-gray-200 px-4 py-4">
                  {service.name}
                </td>

                <td className="border border-gray-200 px-4 py-4 text-right font-medium">
                  {service.price.toFixed(2)}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        <div className="mt-10 border-t border-gray-300 pt-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Notes
          </h3>

          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li>
              The price of prosthetic works includes technical manufacturing.
            </li>

            <li>
              Warranty for conservative works is 1 year,
              and 3 years for prosthetic works.
            </li>

            <li>
              If the appointment is not canceled at least 2 hours before
              the scheduled time, an appointment reservation fee of
              20.00 KM will be charged.
            </li>

            <li>
              For foreign citizens, prices of conservative works
              are calculated according to a special price list.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-14 flex items-end justify-between border-t border-gray-300 pt-6">
          <div>
            <p className="font-semibold text-gray-900">
              Thank you for your trust.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Sarajevo, 13.03.2026.
            </p>
          </div>

          <div className="text-right">
            <p className="font-semibold text-gray-900">
              Dr. Erdin Tatarević
            </p>

            <p className="text-sm text-gray-500">
              Dentist
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}