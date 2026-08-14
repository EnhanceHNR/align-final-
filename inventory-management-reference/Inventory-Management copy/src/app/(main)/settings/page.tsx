import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <PageHeader title="Settings" />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Profile</CardTitle>
                    <CardDescription>Manage your personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input id="firstName" defaultValue="Admin" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input id="lastName" defaultValue="User" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="admin@enhanceinventory.com" />
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Notifications</CardTitle>
                    <CardDescription>Manage how you receive notifications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="low-stock" className="flex flex-col space-y-1">
                            <span>Low Stock Alerts</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Receive a notification when item quantity is below the minimum threshold.
                            </span>
                        </Label>
                        <Switch id="low-stock" defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="expiry-dates" className="flex flex-col space-y-1">
                            <span>Expiry Date Reminders</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Get notified when items are approaching their expiry date.
                            </span>
                        </Label>
                        <Switch id="expiry-dates" defaultChecked />
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="delivery-updates" className="flex flex-col space-y-1">
                            <span>Delivery Updates</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                                Receive alerts for delayed or updated deliveries.
                            </span>
                        </Label>
                        <Switch id="delivery-updates" />
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Data & Export</CardTitle>
                    <CardDescription>Manage your application data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                        <div>
                            <p className="font-medium">Export Inventory Data</p>
                            <p className="text-sm text-muted-foreground">Download a CSV file of your current inventory.</p>
                        </div>
                        <Button variant="outline">Export as CSV</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-2">
                        <div>
                            <p className="font-medium">Export Order History</p>
                            <p className="text-sm text-muted-foreground">Download a PDF of all purchase orders.</p>
                        </div>
                        <Button variant="outline">Export as PDF</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
