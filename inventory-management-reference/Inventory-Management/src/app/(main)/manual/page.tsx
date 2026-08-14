'use client';
import { PageHeader } from "@/components/shared/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ManualPage() {
    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-10">
            <PageHeader title="User Manual" />
            <div className="text-muted-foreground mb-4">
                Welcome to your Inventory Management system! Below you will find detailed instructions on how to use every feature of this application.
            </div>

            <Accordion type="multiple" className="w-full">
                
                <AccordionItem value="dashboard">
                    <AccordionTrigger className="text-lg font-semibold">1. Dashboard</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>The Dashboard provides a high-level overview of your business.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Quick Stats:</strong> View total inventory value, pending orders, unpaid bills, and low stock items at a glance.</li>
                            <li><strong>Alerts:</strong> Important notifications (like low stock warnings) will appear at the top.</li>
                            <li><strong>Recent Activity:</strong> Tracks the latest stock consumption and order events.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="inventory">
                    <AccordionTrigger className="text-lg font-semibold">2. Inventory Management</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Manage your items, check stock levels, and consume items.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Viewing Stock:</strong> The main table shows current stock levels. Items are color-coded based on their status (In Stock, Low Stock, Out of Stock).</li>
                            <li><strong>Adding New Items:</strong> Click "Add Item" to create a new product profile. You can set minimum threshold levels to trigger low-stock alerts.</li>
                            <li><strong>Consuming Stock:</strong> Click the "Adjust" button next to an item to record consumption. The system uses a strict batch-tracking system, meaning you must select which specific delivery batch you are consuming from (prioritizing items expiring soonest).</li>
                            <li><strong>Item Details:</strong> Click on an item name to see a detailed breakdown of its current batches, historical deliveries, and consumption logs.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="orders">
                    <AccordionTrigger className="text-lg font-semibold">3. Purchase Orders</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Track everything you order from suppliers.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Creating Orders:</strong> Go to "Create Order", fill in item details, quantity, expected delivery, and select a dealer.</li>
                            <li><strong>Approval Workflow:</strong> New orders are marked as "Pending Approval". An Admin must approve the order, or a regular user can bypass this by providing a mandatory urgent note.</li>
                            <li><strong>Verifying Delivery:</strong> Once the physical items arrive, click "Verify Delivery" on the Pending order. You will be asked to upload a photo of the bill/challan, enter batch numbers, and set expiry dates. This officially adds the stock to your Inventory!</li>
                            <li><strong>Email Notifications:</strong> Admins receive automatic emails when orders are placed.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bills">
                    <AccordionTrigger className="text-lg font-semibold">4. Billing & Statements</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Consolidate multiple deliveries into a single payment statement.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Generating a Bill:</strong> Select a dealer to see all of their unbilled deliveries. Check the boxes next to the deliveries you want to pay for.</li>
                            <li><strong>Finalizing:</strong> Click "Generate Statement" to group these deliveries into a single outstanding bill.</li>
                            <li><strong>Returns:</strong> If items were damaged, you can initiate a return from the Billing page by uploading evidence photos and deducting the cost from the total bill.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payments">
                    <AccordionTrigger className="text-lg font-semibold">5. Payments</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Track your generated statements and pay your dealers.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Viewing Statements:</strong> Shows all generated bills. You can see the total amount, period, and status (Paid/Unpaid).</li>
                            <li><strong>Marking as Paid:</strong> Click "Mark as Paid" on an unpaid statement. You will need to select the payment mode (Cash, Cheque, UPI, etc.) and optionally enter a Reference Number (like a Cheque No or Transaction ID).</li>
                            <li><strong>Automation:</strong> Marking a statement as paid automatically updates the underlying orders and deliveries as Paid as well.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="reports">
                    <AccordionTrigger className="text-lg font-semibold">6. Reports & History</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Analyze your business operations.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Consumption History:</strong> A master log of every single item consumed across your entire organization, including who consumed it and when.</li>
                            <li><strong>Exporting:</strong> Most tables in the app (including Reports, Inventory, and Orders) feature "Export CSV" and "Export PDF" buttons in the top right corner so you can download data for accounting.</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="settings">
                    <AccordionTrigger className="text-lg font-semibold">7. Settings & Users</AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground space-y-2">
                        <p>Configure the foundational data of the app.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>Categories:</strong> Define the categories used to group items (e.g., Electronics, Consumables, Furniture).</li>
                            <li><strong>Dealers:</strong> Manage your supplier database, including contact information and GST numbers.</li>
                            <li><strong>User Management:</strong> Manage staff access. You must assign the "Admin" role to users who are authorized to approve purchase orders. Make sure Admin users have an email address set so they receive notifications!</li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    );
}
