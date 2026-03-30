import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import PendingPoller from "./PendingPoller";

export default async function PendingPage() {
    const session = await auth();
    if (!session) redirect("/login");
    if (session.user.role !== "UNASSIGNED") redirect("/dashboard");

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020D1A]">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-gray-dark">
                {session.user.image && (
                    <Image
                        src={session.user.image}
                        alt={session.user.name ?? "Avatar"}
                        width={64}
                        height={64}
                        className="mx-auto mb-4 rounded-full"
                    />
                )}
                <h1 className="mb-2 text-xl font-bold text-dark dark:text-white">
                    {session.user.name}
                </h1>
                <div className="mb-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Your account is pending role assignment
                    </p>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                        Please contact the administrator to get access.
                    </p>
                </div>

                {/* Client component that polls /api/users/me and redirects when role changes */}
                <PendingPoller />

                <form
                    action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                    }}
                >
                    <button
                        type="submit"
                        className="text-sm text-primary underline hover:no-underline"
                    >
                        Sign out
                    </button>
                </form>
            </div>
        </div>
    );
}
