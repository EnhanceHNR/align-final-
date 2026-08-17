import { NextRequest, NextResponse } from "next/server";
import { prisma } from "~/lib/prisma";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

function getLogoBase64() {
    const filePath = path.join(process.cwd(), "public/clinic-logo-v3.png");
    const file = fs.readFileSync(filePath);
    return `data:image/png;base64,${file.toString("base64")}`;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                items: true,
                patient: true,
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 }
            );
        }

        const date = new Date(invoice.createdAt).toLocaleDateString("en-GB");
        const logo = getLogoBase64();

        const subtotal = (invoice as any).subtotal || invoice.totalAmount / 1.17;
        const taxAmount = (invoice as any).taxAmount || invoice.totalAmount * 0.17;
        const taxRate = (invoice as any).taxRate || 0.17;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

* {
  font-family: Inter, Arial, sans-serif;
  box-sizing: border-box;
  color: #000;
}

body {
  margin: 0;
  padding: 40px;
  font-size: 12px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 70px;
  height: auto;
  object-fit: contain;
  filter: grayscale(100%) contrast(120%);
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.muted {
  color: #444;
  font-size: 12px;
  margin-top: 2px;
}

.right {
  text-align: right;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin: 25px 0;
  letter-spacing: 1px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th {
  text-align: left;
  border-bottom: 1px solid #000;
  padding: 8px 0;
  font-weight: 600;
}

td {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

/* TOTAL */
.total {
  margin-top: 20px;
  text-align: right;
}

.total-row {
  display: flex;
  justify-content: flex-end;
  gap: 30px;
  margin: 5px 0;
}

.total-row span:first-child {
  color: #666;
}

.total-row span:last-child {
  font-weight: 600;
}

.total-final {
  font-size: 18px;
  font-weight: 700;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid #000;
}

/* FOOTER */
.footer {
  margin-top: 60px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.signature {
  text-align: right;
}

.line {
  margin-top: 40px;
  border-top: 1px solid #000;
  width: 200px;
  margin-left: auto;
}
</style>
</head>

<body>

<div class="header">
  <div class="brand">
    <img class="logo" src="${logo}" />
    <div>
      <div class="title">Align.io</div>
      <div class="muted">Private dental clinic</div>
      <div class="muted">Dr. Erdin Tatarević</div>
      <div class="muted">Višnjik 34 B, Sarajevo</div>
    </div>
  </div>

  <div class="right">
    <div><b>Invoice No:</b> ${invoice.invoiceNumber}</div>
    <div><b>Date:</b> ${date}</div>
  </div>
</div>

<div class="section-title">INVOICE</div>

<div>
  <b>Patient:</b> ${invoice.patient.fullName}<br/>
  <b>Phone:</b> ${invoice.patient.phone || "-"}
</div>

<table>
  <thead>
    <tr>
      <th>Service</th>
      <th>Quantity</th>
      <th>Price</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    ${invoice.items
            .map((item) => {
                const total = item.unitPrice * item.quantity;
                return `
        <tr>
          <td>${item.serviceName}</td>
          <td>${item.quantity}</td>
          <td>${item.unitPrice.toFixed(2)} KM</td>
          <td>${total.toFixed(2)} KM</td>
        </tr>
      `;
            })
            .join("")}
  </tbody>
</table>

<div class="total">
  <div class="total-row">
    <span>Subtotal:</span>
    <span>${subtotal.toFixed(2)} KM</span>
  </div>
  <div class="total-row">
    <span>VAT (17%):</span>
    <span>${taxAmount.toFixed(2)} KM</span>
  </div>
  <div class="total-final">
    Total to pay: ${invoice.totalAmount.toFixed(2)} KM
  </div>
</div>

<div class="footer">
  <div>
    Thank you for your trust!<br/>
    Sarajevo, ${date}
  </div>

  <div class="signature">
    Signature and stamp
    <div class="line"></div>
    <div><b>Dr. Erdin Tatarević</b></div>
    <div>Dentist</div>
  </div>
</div>

</body>
</html>
`;

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "load" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
        });

        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
            },
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Error generating PDF" },
            { status: 500 }
        );
    }
}