"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { bs } from "date-fns/locale";
import { Trash2 } from "lucide-react";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { api } from "~/trpc/react";

const services = [
  { code: "0001", name: "Estetska jednopovršinska plomba", price: 50 },
  { code: "0002", name: "Estetska dvopovršinska plomba", price: 60 },
  { code: "0003", name: "Estetska tropovršinska plomba", price: 70 },
  { code: "0004", name: "Estetska jednopovršinska plomba - molari", price: 60 },
  { code: "0005", name: "Estetska dvopovršinska plomba - molari", price: 70 },
  { code: "0006", name: "Estetska tropovršinska plomba - molari", price: 80 },
  { code: "0007", name: "Nadogradnja zuba", price: 90 },
  { code: "0008", name: "Estetska kompozitna faseta", price: 90 },
  { code: "0009", name: "Plombiranje eq.", price: 40 },
  { code: "0010", name: "Amalgamska plomba", price: 50 },
  { code: "0011", name: "Zalivanje fisura za jedan zub", price: 30 },
  { code: "0012", name: "Ugradnja parapulparnog kočića", price: 50 },
  { code: "0013", name: "Konfekcijski intraradikularni kočić", price: 50 },
  { code: "0014", name: "Livena kočić nadogradnja - jednokorijena", price: 50 },
  { code: "0015", name: "Livena kočić nadogradnja - dvokorijena", price: 60 },
  { code: "0016", name: "Livena kočić nadogradnja - trokorijena", price: 70 },
  { code: "0017", name: "Estetska porculanska navlaka ili član mosta na metalu", price: 250 },
  { code: "0018", name: "Estetska porculanska navlaka sa stepenikom na metalu", price: 280 },
  { code: "0019", name: "Cirkonska navlaka - bezmetalna", price: 380 },
  { code: "0020", name: "Privremena navlaka ili član mosta", price: 30 },
  { code: "0021", name: "Totalna proteza estetska - troslojni zubi", price: 500 },
  { code: "0022", name: "Totalna proteza - fiziodens zubi", price: 700 },
  { code: "0023", name: "Totalna proteza - keramički zubi", price: 1000 },
  { code: "0024", name: "Parcijalna proteza - troslojni zubi", price: 450 },
  { code: "0025", name: "Parcijalna proteza - fiziodens zubi", price: 650 },
  { code: "0026", name: "Parcijalna proteza - keramički zubi", price: 850 },
  { code: "0027", name: "Metalna parcijalna proteza sa kukicama", price: 800 },
  { code: "0028", name: "Estetska metalna skelet proteza sa dvije bravice", price: 1100 },
  { code: "0029", name: "Estetska metalna skelet proteza sa dvije bravice - fiziodens", price: 1300 },
  { code: "0030", name: "Reparacija proteze", price: 50 },
  { code: "0031", name: "Podlaganje proteze", price: 60 },
  { code: "0032", name: "Ekstirpacija pulpe jednokorjenog zuba", price: 140 },
  { code: "0033", name: "Ekstirpacija pulpe dvokorjenog zuba", price: 160 },
  { code: "0034", name: "Ekstirpacija pulpe trokanalnog zuba", price: 200 },
  { code: "0035", name: "Liječenje gangrene jednokorjenog zuba", price: 160 },
  { code: "0036", name: "Liječenje gangrene dvokorjenog zuba", price: 180 },
  { code: "0037", name: "Liječenje gangrene trokanalnog zuba", price: 220 },
  { code: "0038", name: "Tretman periodontalnog džepa lijekovima", price: 30 },
  { code: "0039", name: "Subgingivalna kiretaža", price: 30 },
  { code: "0040", name: "Gingivektomija", price: 30 },
  { code: "0041", name: "Ekstrakcija jednokorijenog zuba", price: 50 },
  { code: "0042", name: "Ekstrakcija dvokorijenog zuba", price: 60 },
  { code: "0043", name: "Ekstrakcija molara", price: 70 },
  { code: "0044", name: "Ekstrakcija RR", price: 80 },
  { code: "0045", name: "Hirurška ekstrakcija umnjaka", price: 180 },
  { code: "0046", name: "Ekstrakcija totalno impaktiranog umnjaka", price: 300 },
  { code: "0047", name: "Premolarizacija zuba", price: 200 },
  { code: "0048", name: "Replantacija zuba", price: 300 },
  { code: "0049", name: "Apikotomija jednokorijenog zuba", price: 200 },
  { code: "0050", name: "Apikotomija dvokorijenog zuba", price: 250 },
  { code: "0051", name: "Incizija sa drenom", price: 50 },
  { code: "0052", name: "Sutura (šivanje)", price: 70 },
  { code: "0053", name: "Splint fiksacija po zubu", price: 30 },
  { code: "0054", name: "Bijeljenje avitalnog zuba", price: 150 },
  { code: "0055", name: "Bijeljenje vitalnih zuba", price: 40 },
  { code: "0056", name: "Ultrazvučno čišćenje i bijeljenje zuba", price: 50 },
  { code: "0057", name: "Kućna posjeta", price: 70 },
  { code: "0058", name: "Prvi pregled", price: 20 },
  { code: "0059", name: "Kontrolni pregled", price: 50 },
  { code: "0060", name: "Anestezija", price: 10 },
];

export default function InvoiceForm() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [patientOpen, setPatientOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [date, setDate] = useState<Date>();
  const [status, setStatus] = useState<"DRAFT" | "PAID" | "UNPAID">("DRAFT");
  const [patientError, setPatientError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [items, setItems] = useState([
    {
      serviceId: "",
      quantity: 1,
    },
  ]);

  const { data: patientsData } = api.patients.list.useQuery({
    page: 1,
    perPage: 100,
  });
  const createInvoice = api.invoice.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/invoices/${data.invoice.id}`);
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      setSubmitError(error.message || "Error saving invoice");
    },
  });

  const patients = patientsData?.patients || [];

  const subtotal = items.reduce((sum, item) => {
    const service = services.find((s) => s.code === item.serviceId);
    return sum + (service?.price ?? 0) * item.quantity;
  }, 0);

  const taxRate = 0.17;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setPatientError("");
    setServiceError("");

    let hasError = false;

    if (!selectedPatientId) {
      setPatientError("Select a patient.");
      hasError = true;
    }

    if (
      items.length === 0 ||
      items.every((item) => item.serviceId === "")
    ) {
      setServiceError("Add at least one service.");
      hasError = true;
    }

    if (hasError) return;

    const invoiceItems = items
      .filter((item) => item.serviceId !== "")
      .map((item) => {
        const service = services.find((s) => s.code === item.serviceId);
        return {
          serviceCode: item.serviceId,
          serviceName: service?.name || "",
          quantity: item.quantity,
          priceSnapshot: service?.price || 0,
        };
      });

    createInvoice.mutate({
      patientId: selectedPatientId,
      items: invoiceItems,
      status,
    });
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        serviceId: "",
        quantity: 1,
      },
    ]);
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-semibold">
        New invoice
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Patient
          </label>

          <Popover open={patientOpen} onOpenChange={setPatientOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between h-12 rounded-xl font-normal"
              >
                {selectedPatientId
                  ? patients.find((p) => p.id === selectedPatientId)?.fullName
                  : "Select a patient"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[450px] p-0">
              <Command>
                <CommandInput placeholder="Search patients..." />
                <CommandEmpty>No patients found.</CommandEmpty>
                <CommandGroup className="max-h-72 overflow-y-auto">
                  {patients.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={patient.fullName}
                      onSelect={() => {
                        setSelectedPatientId(patient.id);
                        setPatientOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedPatientId === patient.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {patient.fullName} ({patient.jmb})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {patientError && (
            <p className="mt-1 text-sm text-red-500">{patientError}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Date
          </label>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-medium h-12 rounded-xl"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />

                {date
                  ? format(date, "dd.MM.yyyy.")
                  : "Select a date"}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-3 rounded-xl">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={bs}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Services
          </label>

          {items.map((item, index) => {
            const service = services.find(
              (s) => s.code === item.serviceId
            );

            return (
              <div
                key={index}
                className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center"
              >
                <Popover
                  open={openIndex === index}
                  onOpenChange={(open) =>
                    setOpenIndex(open ? index : null)
                  }
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-12 w-full justify-between rounded-xl font-normal"
                    >
                      {item.serviceId
                        ? services.find(
                          (s) => s.code === item.serviceId
                        )?.name
                        : "Select a service"}

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-[450px] p-0">
                    <Command>
                      <CommandInput placeholder="Search service..." />

                      <CommandEmpty>
                        No services found.
                      </CommandEmpty>

                      <CommandGroup className="max-h-72 overflow-y-auto">
                        {services.map((svc) => (
                          <CommandItem
                            key={svc.code}
                            value={`${svc.code} ${svc.name}`}
                            onSelect={() => {
                              const updated = [...items];
                              if (updated[index]) {
                                updated[index].serviceId = svc.code;
                              }
                              setItems(updated);
                              setOpenIndex(null);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                item.serviceId === svc.code
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />

                            {svc.code} - {svc.name} (
                            {svc.price} KM)
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...items];
                    if (updated[index]) {
                      updated[index].quantity = Number(e.target.value);
                    }

                    setItems(updated);
                  }}
                />

                <>
                  <Input
                    disabled
                    value={
                      service
                        ? `${service.price} KM`
                        : ""
                    }
                  />


                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setItems(
                        items.filter(
                          (_, itemIndex) => itemIndex !== index
                        )
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                </>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addItem}
          >
            + Add service
          </Button>

          {serviceError && (
            <p className="text-sm text-red-500">
              {serviceError}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-gray-50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} KM</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT (17%):</span>
            <span>{taxAmount.toFixed(2)} KM</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>{total.toFixed(2)} KM</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Status
          </label>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "DRAFT" | "PAID" | "UNPAID")}
            className="w-full rounded-xl border border-gray-300 p-3 h-12"
          >
            <option value="DRAFT">Draft</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>

        {submitError && (
          <div className="rounded-xl bg-red-50 p-3 text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createInvoice.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createInvoice.isPending ? "Saving..." : "Save invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}