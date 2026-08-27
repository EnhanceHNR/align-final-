import { LeaveRequestManager } from "@/components/leaves/leave-request-manager";

export default function ApprovalsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full max-w-7xl mx-auto overflow-x-hidden bg-[#F7F7F6] min-h-screen">
      <LeaveRequestManager />
    </div>
  );
}