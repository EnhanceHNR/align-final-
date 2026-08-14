"use client";

import { useState } from "react";
import { dentalServices as initialServices } from "~/data/dentalServices";
import PriceItemForm from "@/components/pricing/PriceItemForm";

import PriceListTable from "@/components/pricing/PriceListTable";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PriceListPage() {
  const [services, setServices] = useState(initialServices);
  const deleteService = (code: string) => {
    setServices((prev) =>
      prev.filter((service) => service.code !== code)
    );
  };
  const addService = (service: {
    code: string;
    name: string;
    price: number;
  }) => {
    const lastCode =
      services.length > 0
        ? Number(services[services.length - 1]?.code)
        : 0;

    const nextCode = String(lastCode + 1).padStart(4, "0");

    setServices((prev) => [
      ...prev,
      {
        ...service,
        code: nextCode,
      },
    ]);
  };
  const handleDownloadPdf = () => {
    localStorage.setItem(
      "priceListServices",
      JSON.stringify(services)
    );

    window.open(
      "/dashboard/price-list/preview",
      "_blank"
    );
  };
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">

        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Price list
            </h1>

            <p className="mt-1 text-gray-500">
              Overview of all dental services and their prices.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleDownloadPdf}
          >
            Preview
          </Button>
        </div>

        <PriceItemForm onAddService={addService} />

        {/* Tabela */}
        <PriceListTable
          services={services}
          onDeleteService={deleteService}
        />

        {/* Napomene */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-xl font-semibold">
            Notes
          </h3>

          <ul className="list-disc space-y-3 pl-5 text-gray-700">
            <li>
              The price of prosthetic works includes technical manufacturing.
            </li>

            <li>
              Warranty for conservative works is 1 year,
              and 3 years for prosthetic works.
            </li>

            <li>
              If you do not cancel the appointment at least 2 hours before
              the scheduled time, an appointment reservation fee of
              20 KM will be charged.
            </li>

            <li>
              For foreign citizens, prices of conservative works
              are doubled.
            </li>
          </ul>

          <div className="mt-6 border-t pt-4 text-gray-500">
            <p className="font-medium">
              Thank you for your trust!
            </p>

            <p className="mt-2">
              Sarajevo, 13.03.2025.
            </p>

            <p>
              Dr. Erdin Tatarević, dentist
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}