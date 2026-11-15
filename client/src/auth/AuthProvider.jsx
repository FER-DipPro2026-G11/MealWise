import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "./AuthContext";
import {
    CURRENT_USER_KEY,
    fetchCurrentUser,
    login as loginRequest,
    logout as logoutRequest,
    register as registerRequest,
} from "../api/auth";

export default function AuthProvider({ children }) {
    const queryClient = useQueryClient();

    // Asks the server who is logged in (the cookie is sent automatically).
    // Only changes through the mutations below, so it never goes stale.
    const { data: user, isPending } = useQuery({
        queryKey: CURRENT_USER_KEY,
        queryFn: fetchCurrentUser,
        staleTime: Infinity,
    });

    const setUser = (newUser) =>
        queryClient.setQueryData(CURRENT_USER_KEY, newUser);

    const login = useMutation({ mutationFn: loginRequest, onSuccess: setUser });
    const register = useMutation({
        mutationFn: registerRequest,
        onSuccess: setUser,
    });
    const logout = useMutation({
        mutationFn: logoutRequest,
        onSuccess: () => {
            // Drop everything cached for the previous user.
            queryClient.clear();
            setUser(null);
        },
    });

    const value = {
        user: user ?? null,
        isLoading: isPending,
        login,
        register,
        logout,
    };

    return <AuthContext value={value}>{children}</AuthContext>;
}
