"use client";

import { useAutoLogout } from "@/hooks/useAutoLogout";
import { useSession } from "next-auth/react";

export default function AutoLogoutProvider({
                                               children,
                                           }: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();

    const { showWarning, setShowWarning, resetTimer } = useAutoLogout();


    if (status !== "authenticated") {
        return <>{children}</>;
    }

    return (
        <>
            {children}

            {showWarning && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
                    <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm">
                        <p className="mb-4 text-gray-700">
                            You will be automatically logged out due to inactivity.
                        </p>

                        <button
                            onClick={() => {
                                setShowWarning(false);
                                resetTimer();
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                        >
                            Stay logged in
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}