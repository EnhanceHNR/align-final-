"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image"; // Imported to handle optimized and responsive clinic logo
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Search,
    Receipt,
    Settings,
    TestTube,
    Microscope,
    Send,
    Download,
    FileText,
    Building2,
    FlaskConical,
    BarChart2,
    Package,
    ShoppingCart,
    Truck,
    Factory,
    CreditCard,
    ImageIcon,
    Clock,
    UserCog,
    CalendarRange,
    Banknote,
    LogOut,
    Undo2,
    CheckCircle,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type DashboardSidebarProps = {
    isMaster?: boolean;
};

export function DashboardSidebar({
                                     isMaster = true,
                                 }: DashboardSidebarProps) {
    const pathname = usePathname();
    return (
        <Sidebar className="border-r bg-white/50 backdrop-blur-xl">
<SidebarHeader className="sticky top-0 bg-white/80 backdrop-blur-md z-10 pb-4 border-b">

            {/* LOGO */}
            <div className="mb-2 flex flex-col items-center gap-3 px-2">

                <div className="relative flex h-24 w-36 items-center justify-center">
                    <Image 
                        src="/clinic-logo-v3.png" 
                        alt="Clinic Official Logo" 
                        fill
                        priority
                        className="object-contain"
                    />
                </div>

                <div className="flex flex-col items-center">


          <span className="text-2xl font-black tracking-tighter text-[#1e293b]">
            Align<span className="text-[#3b82f6]">.io</span>
          </span>

                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Management System
          </span>

                </div>
            </div>

            </SidebarHeader>
            <SidebarContent className="p-4 space-y-6 overflow-y-auto">
            {/* SEARCH */}
            <div className="relative">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                    placeholder="Search patients..."
                    className="ring-blue-100 h-10 rounded-xl border-none bg-slate-50 pl-10 text-sm focus-visible:ring-1"
                />

            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 space-y-2">
                <Link href="/dashboard">
                    <NavItem
                        icon={<LayoutDashboard size={18} />}
                        label="Dashboard"
                        active={pathname === "/dashboard"}
                    />
                </Link>

                <Accordion type="multiple" defaultValue={["patient-management", "lab-management", "inventory-management", "hr-management", "elearning-management"]} className="w-full">
                  <AccordionItem value="patient-management" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider">
                      Patient Management
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      <Link href="/dashboard/appointments">
                          <NavItem
                              icon={<CalendarClock size={18} />}
                              label="Calendar & Appointments"
                              active={pathname === "/dashboard/appointments"}
                          />
                      </Link>

                      <Link href="/dashboard/patients">
                          <NavItem
                              icon={<Users size={18} />}
                              label="Patient Database"
                              active={pathname.startsWith("/dashboard/patients")}
                          />
                      </Link>

                      <Link href="/dashboard/history">
                          <NavItem
                              icon={<History size={18} />}
                              label="Patient History"
                              active={pathname.startsWith("/dashboard/history")}
                          />
                      </Link>

                      <Link href="/dashboard/invoices">
                        <NavItem
                          icon={<Receipt size={18} />}
                          label="Invoices & Billing"
                          active={pathname.startsWith("/dashboard/invoices")}
                        />
                      </Link>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="lab-management" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">
                      Lab Management
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      <Link href="/dashboard/lab/send">
                          <NavItem
                              icon={<Send size={18} />}
                              label="Send Item"
                              active={pathname.startsWith("/dashboard/lab/send")}
                          />
                      </Link>

                      <Link href="/dashboard/lab/receive">
                          <NavItem
                              icon={<Download size={18} />}
                              label="Receive Item"
                              active={pathname.startsWith("/dashboard/lab/receive")}
                          />
                      </Link>

                      <Link href="/dashboard/lab/partners">
                          <NavItem
                              icon={<FlaskConical size={18} />}
                              label="Labs & Partners"
                              active={pathname.startsWith("/dashboard/lab/partners")}
                          />
                      </Link>

                      <Link href="/dashboard/lab/records">
                          <NavItem
                              icon={<FileText size={18} />}
                              label="History"
                              active={pathname.startsWith("/dashboard/lab/records")}
                          />
                      </Link>

                      <Link href="/dashboard/lab/bills">
                          <NavItem
                              icon={<Receipt size={18} />}
                              label="Bills and Challans"
                              active={pathname.startsWith("/dashboard/lab/bills")}
                          />
                      </Link>

                      <Link href="/dashboard/lab/analytics">
                          <NavItem
                              icon={<BarChart2 size={18} />}
                              label="Analytics"
                              active={pathname.startsWith("/dashboard/lab/analytics")}
                          />
                      </Link>
                      
                      {isMaster && (
                        <Link href="/dashboard/lab/management">
                            <NavItem
                                icon={<Building2 size={18} />}
                                label="Instruction Templates"
                                active={pathname.startsWith("/dashboard/lab/management")}
                                isMasterOnly={true}
                            />
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="inventory-management" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">
                      Inventory Management
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      <Link href="/dashboard/inventory">
                          <NavItem
                              icon={<Package size={18} />}
                              label="Inventory"
                              active={pathname === "/dashboard/inventory" || pathname.startsWith("/dashboard/inventory/add")}
                          />
                      </Link>

                      <Link href="/dashboard/inventory/dealers">
                          <NavItem
                              icon={<Factory size={18} />}
                              label="Dealers"
                              active={pathname.startsWith("/dashboard/inventory/dealers")}
                          />
                      </Link>

                      <Link href="/dashboard/inventory/orders">
                          <NavItem
                              icon={<ShoppingCart size={18} />}
                              label="Orders"
                              active={pathname.startsWith("/dashboard/inventory/orders")}
                          />
                      </Link>



                      <Link href="/dashboard/inventory/bills">
                          <NavItem
                              icon={<Receipt size={18} />}
                              label="Bills"
                              active={pathname.startsWith("/dashboard/inventory/bills")}
                          />
                      </Link>

                      <Link href="/dashboard/inventory/payments">
                          <NavItem
                              icon={<CreditCard size={18} />}
                              label="Payments"
                              active={pathname.startsWith("/dashboard/inventory/payments")}
                          />
                      </Link>

                      <Link href="/dashboard/inventory/history">
                          <NavItem
                              icon={<FileText size={18} />}
                              label="Consumption History"
                              active={pathname.startsWith("/dashboard/inventory/history")}
                          />
                      </Link>

                      <Link href="/dashboard/inventory/reports">
                          <NavItem
                              icon={<BarChart2 size={18} />}
                              label="Reports"
                              active={pathname.startsWith("/dashboard/inventory/reports")}
                          />
                      </Link>

                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="hr-management" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">
                      HR & Attendance
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      <Link href="/dashboard/attendance">
                          <NavItem
                              icon={<Clock size={18} />}
                              label="Attendance"
                              active={pathname === "/dashboard/attendance"}
                          />
                      </Link>

                      <Link href="/dashboard/attendance/leaves">
                          <NavItem
                              icon={<CalendarRange size={18} />}
                              label="My Leaves"
                              active={pathname.startsWith("/dashboard/attendance/leaves")}
                          />
                      </Link>

                      <Link href="/dashboard/attendance/payroll">
                          <NavItem
                              icon={<Banknote size={18} />}
                              label="Payroll"
                              active={pathname.startsWith("/dashboard/attendance/payroll")}
                          />
                      </Link>

                      <Link href="/dashboard/attendance/resignations">
                          <NavItem
                              icon={<LogOut size={18} />}
                              label="Resignations"
                              active={pathname.startsWith("/dashboard/attendance/resignations")}
                          />
                      </Link>

                      <Link href="/dashboard/attendance/documents">
                          <NavItem
                              icon={<FileText size={18} />}
                              label="Documents"
                              active={pathname.startsWith("/dashboard/attendance/documents")}
                          />
                      </Link>

                      <Link href="/dashboard/attendance/rejoin-requests">
                          <NavItem
                              icon={<Undo2 size={18} />}
                              label="Rejoin Requests"
                              active={pathname.startsWith("/dashboard/attendance/rejoin-requests")}
                          />
                      </Link>

                      {isMaster && (
                        <>
                          <Link href="/dashboard/attendance/employees">
                              <NavItem
                                  icon={<UserCog size={18} />}
                                  label="Employees"
                                  active={pathname.startsWith("/dashboard/attendance/employees")}
                                  isMasterOnly={true}
                              />
                          </Link>

                          <Link href="/dashboard/attendance/approvals">
                              <NavItem
                                  icon={<CheckCircle size={18} />}
                                  label="Approvals"
                                  active={pathname.startsWith("/dashboard/attendance/approvals")}
                                  isMasterOnly={true}
                              />
                          </Link>

                          <Link href="/dashboard/attendance/holidays">
                              <NavItem
                                  icon={<CalendarRange size={18} />}
                                  label="Holidays"
                                  active={pathname.startsWith("/dashboard/attendance/holidays")}
                                  isMasterOnly={true}
                              />
                          </Link>

                          <Link href="/dashboard/attendance/analytics">
                              <NavItem
                                  icon={<BarChart2 size={18} />}
                                  label="Analytics"
                                  active={pathname.startsWith("/dashboard/attendance/analytics")}
                                  isMasterOnly={true}
                              />
                          </Link>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="elearning-management" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline py-2 text-sm font-semibold text-slate-400 uppercase tracking-wider mt-4">
                      E-Learning
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-2">
                      <Link href="/dashboard/learning">
                          <NavItem
                              icon={<FileText size={18} />}
                              label="Learning Videos"
                              active={pathname === "/dashboard/learning"}
                          />
                      </Link>

                      <Link href="/dashboard/learning">
                          <NavItem
                              icon={<ImageIcon size={18} />}
                              label="Learning Images"
                              active={false}
                          />
                      </Link>

                      <Link href="#">
                          <NavItem
                              icon={<FileText size={18} />}
                              label="Workflows"
                              active={false}
                          />
                      </Link>

                      {isMaster && (
                        <Link href="/dashboard/learning/manage">
                            <NavItem
                                icon={<Settings size={18} />}
                                label="Manage Image Learning"
                                active={pathname === "/dashboard/learning/manage"}
                                isMasterOnly={true}
                            />
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
            </nav>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t bg-white/80 backdrop-blur-md">
                <Link href="/dashboard/settings">
                    <NavItem
                        icon={<Settings size={18} />}
                        label="Settings"
                        active={pathname.startsWith("/dashboard/settings")}
                    />
                </Link>
            </SidebarFooter>

        </Sidebar>
    );
}

function NavItem({
                     icon,
                     label,
                     active,
                     isMasterOnly,
                 }: {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    isMasterOnly?: boolean;
}) {
    const { setOpenMobile, isMobile } = useSidebar();

    return (
        <div
            onClick={() => {
                if (isMobile) {
                    setOpenMobile(false);
                }
            }}
            className={`
        flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer
        ${
                active
                    ? "bg-blue-600 font-semibold text-white shadow-md shadow-blue-100"
                    : "font-semibold text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            }
        ${
                isMasterOnly
                    ? "hover:bg-rose-50 hover:text-rose-600"
                    : ""
            }
      `}
        >

            {icon}

            <span className="flex-1 text-sm tracking-tight">
        {label}
      </span>

            {isMasterOnly && (
                <LockIcon
                    size={14}
                    className="text-rose-300"
                />
            )}

        </div>
    );
}

function LockIcon({
                      size,
                      className,
                  }: {
    size: number;
    className: string;
}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
            />

            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}