import { useContext } from "react";
import { AuthContext } from "./AuthContext";

// Returns { user, isLoading, login, register, logout }.
// user is null when logged out. login/register/logout are TanStack Query
// mutations: call login.mutate({ email, password }), and read
// login.isPending / login.error for the UI.
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside <AuthProvider>");
    }
    return context;
}
