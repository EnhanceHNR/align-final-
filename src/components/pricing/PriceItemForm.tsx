"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  onAddService: (service: {
    code: string;
    name: string;
    price: number;
  }) => void;
};

export default function PriceItemForm({
                                        onAddService,
                                      }: Props) {
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceName.trim() || !price) {
      alert("Enter the service name and price.");
      return;
    }

    onAddService({
      code: "",
      name: serviceName,
      price: Number(price),
    });

    setServiceName("");
    setPrice("");
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-semibold">
        Add service
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Service name
          </label>

          <Input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="E.g. Checkup"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Price (KM)
          </label>

          <Input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="50"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            Add service
          </Button>
        </div>


      </form>
    </div>
  );
}