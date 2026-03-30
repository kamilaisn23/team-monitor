export type AppRole = "SUPERADMIN" | "MANAGER" | "DEVELOPER" | "UNASSIGNED";

export type WorkloadLevel = "low" | "medium" | "high";

// Extend NextAuth session types
declare module "next-auth" {
    interface Session {
        user: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: AppRole;
            isSuperadmin: boolean;
        };
    }
}
