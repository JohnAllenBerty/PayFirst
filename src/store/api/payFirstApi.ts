import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryApi, FetchArgs } from "@reduxjs/toolkit/query";
import { toast } from "react-toastify";

// Types
export type ApiSuccess<T> = { status: true; message: string; data: T };
export type ApiFail = { status: false; message: string; error: unknown };
export type AuthToken = { token: string };
export type Profile = {
    user: string;
    first_name: string;
    last_name: string;
    date_joined: string;
    last_login: string;
};
export type ContactGroup = {
    id: number;
    name: string;
    owner?: number;
    parent_group?: number | null;
    subgroups?: ContactGroup[];
};
export type Contact = { id: number; name: string; owner: number; groups: number[]; data: Record<string, unknown> };
export type Transaction = {
    id: number;
    label: string;
    contact: number;
    _type: "credit" | "debit";
    amount: number;
    description: string;
    return_date?: string | null;
    date: string;
    pending_amount: number;
    repayments: Array<{ id: number; label: string; amount: number; remarks: string; date: string }>;
};
export type Repayment = {
    id: number;
    label: string;
    transaction: number;
    amount: number;
    remarks: string;
    date: string;
};

// DRF-style pagination shape
export type Paginated<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
    page?: number;
    total_pages?: number;
};

// Common list params for server-side pagination/filtering
export type ListParams = {
    page?: number;
    page_size?: number;
    search?: string;
    ordering?: string; // e.g., 'name' or '-name'
};

async function handle401Response() {
    // Redirect to login on unauthorized
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}

async function handle500Response() {
    const { store } = await import('../store');
    const { setError } = await import('../slices/errorSlice'); // Assuming openLoginModal is also dynamically imported if needed
    store.dispatch(setError('500'));
    toast.error('Internal Server Error');
}

const baseQuery = fetchBaseQuery({
    baseUrl: '/api', // Vite proxy -> Django at http://localhost:8000
    prepareHeaders: (headers) => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (token) headers.set("Authorization", `Token ${token}`);
        return headers;
    },
    responseHandler: async (response) => {
        if (response.status === 401) {
            handle401Response();
        }
        if (response.status === 500) {
            handle500Response();
        }
        if (response.headers.get('Content-Type')?.includes('application/pdf')) {
            const contentDisposition = response.headers.get('Content-Disposition');
            const filename = contentDisposition?.split('filename=')[1].split(';')[0].replace(/"/g, '');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            return { url: blobUrl, filename: filename };
        } else if (response.headers.get('Content-Type')?.includes('application/json')) {
            return response.json();
        } else if (response.headers.get('Content-Type')?.includes('text/html; charset=UTF-8')) {
            return response.text();
        }
        return response;
    },
});

const customBaseQuery = async (
    args: string | FetchArgs,
    api: BaseQueryApi,
    extraOptions: unknown,
) => {
    const result = await baseQuery(args, api, extraOptions as Record<string, unknown>);

    // Transform the data to ensure it is serializable
    if (result.data) {
        result.data = JSON.parse(JSON.stringify(result.data));
    }

    return result;
};

export const payFirstApi = createApi({
    reducerPath: "payFirstApi",
    baseQuery: customBaseQuery,
    keepUnusedDataFor: 0,
    tagTypes: [
        "User",
        "ContactGroups",
        "Contacts",
        "Transactions",
        "Repayments",
    ],
    endpoints: (builder) => ({
        // Auth
        login: builder.mutation<ApiSuccess<AuthToken> | ApiFail, { username: string; password: string; remember?: boolean }>({
            query: ({ username, password }) => ({ url: "/login", method: "POST", body: { username, password } }),
            async onQueryStarted(arg, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if ((data as ApiSuccess<AuthToken>)?.status) {
                        const token = (data as ApiSuccess<AuthToken>).data.token;
                        if (arg?.remember) {
                            localStorage.setItem("token", token);
                            sessionStorage.removeItem("token");
                        } else {
                            sessionStorage.setItem("token", token);
                            localStorage.removeItem("token");
                        }
                    }
                } catch (e) {
                    // swallow
                    console.error(e);
                }
            },
            invalidatesTags: ["User"],
        }),
        logout: builder.mutation<unknown, void>({
            query: () => ({ url: "/logout", method: "DELETE" }),
            async onQueryStarted(_, { queryFulfilled }) {
                try { await queryFulfilled; } finally { localStorage.removeItem("token"); }
            },
            invalidatesTags: ["User"],
        }),
        signUp: builder.mutation<ApiSuccess<Record<string, unknown>> | ApiFail, { username: string; password: string; first_name: string; last_name?: string }>({
            query: (body) => ({ url: "/signup", method: "POST", body }),
        }),
        changePassword: builder.mutation<unknown, { password: string; new_password: string }>({
            query: (body) => ({ url: "/change_password", method: "POST", body }),
        }),
        profile: builder.query<ApiSuccess<Profile> | ApiFail, void>({
            query: () => ({ url: "/profile" }),
            transformResponse: (res: ApiSuccess<Record<string, unknown>> | ApiFail): ApiSuccess<Profile> | ApiFail => {
                if ('status' in res && res.status === true) {
                    const d = res.data as Record<string, unknown>
                    const mapped: Profile = {
                        user: String(d.username ?? ''),
                        first_name: String(d.first_name ?? ''),
                        last_name: String(d.last_name ?? ''),
                        date_joined: String(d.date_joined ?? ''),
                        last_login: String(d.last_login ?? ''),
                    }
                    return { status: true, message: res.message, data: mapped }
                }
                return res
            },
            providesTags: ["User"],
        }),
        updateProfile: builder.mutation<
            ApiSuccess<Profile> | ApiFail,
            Partial<Pick<Profile, 'first_name' | 'last_name' | 'user'>>
        >({
            query: (body) => {
                const { user, first_name, last_name, ...rest } = body
                // Backend expects 'username'; map from our 'user' if provided
                const payload: Record<string, unknown> = { ...rest }
                if (typeof user === 'string') payload.username = user
                if (typeof first_name === 'string') payload.first_name = first_name
                if (typeof last_name === 'string') payload.last_name = last_name
                return { url: `/profile`, method: "PATCH", body: payload }
            },
            invalidatesTags: ["User"],
            async onQueryStarted(changes, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    payFirstApi.util.updateQueryData('profile', undefined, (draft) => {
                        if (draft && typeof draft !== 'string' && draft.status) {
                            const apply: Partial<Profile> = { ...changes }
                            draft.data = { ...draft.data, ...apply } as Profile
                        }
                    })
                );
                try { await queryFulfilled; } catch { patch.undo(); }
            },
        }),

        // Contact Groups
        listContactGroups: builder.query<ApiSuccess<ContactGroup[]> | ApiFail, ListParams | void>({
            query: (params) => params
                ? ({ url: "/user/contact-groups/", params: params as Record<string, string | number | boolean | undefined> })
                : ({ url: "/user/contact-groups/" }),
            providesTags: ["ContactGroups"],
        }),
        createContactGroup: builder.mutation<ApiSuccess<ContactGroup> | ApiFail, { name: string; parent_group?: number | null }>({
            query: (body) => ({ url: "/user/contact-groups/", method: "POST", body }),
            invalidatesTags: ["ContactGroups"],
        }),
        getContactGroup: builder.query<ApiSuccess<ContactGroup> | ApiFail, number>({
            query: (id) => ({ url: `/user/contact-groups/${id}/` }),
            providesTags: ["ContactGroups"],
        }),
        updateContactGroup: builder.mutation<ApiSuccess<ContactGroup> | ApiFail, { id: number; changes: Partial<Omit<ContactGroup, 'id'>> }>({
            query: ({ id, changes }) => ({ url: `/user/contact-groups/${id}/`, method: "PATCH", body: changes }),
            invalidatesTags: ["ContactGroups"],
            async onQueryStarted({ id, changes }, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    payFirstApi.util.updateQueryData('listContactGroups', undefined, (draft) => {
                        if (draft && typeof draft !== 'string' && (draft as ApiSuccess<ContactGroup[]>).status) {
                            const typed = draft as ApiSuccess<ContactGroup[]>;
                            const item = typed.data.find(g => g.id === id);
                            if (item) Object.assign(item, changes);
                        }
                    })
                );
                try { await queryFulfilled; } catch { patch.undo(); }
            },
        }),
        deleteContactGroup: builder.mutation<ApiSuccess<unknown> | ApiFail, number>({
            query: (id) => ({ url: `/user/contact-groups/${id}/`, method: "DELETE" }),
            invalidatesTags: ["ContactGroups"],
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    payFirstApi.util.updateQueryData('listContactGroups', undefined, (draft) => {
                        if (draft && typeof draft !== 'string' && (draft as ApiSuccess<ContactGroup[]>).status) {
                            const typed = draft as ApiSuccess<ContactGroup[]>;
                            typed.data = typed.data.filter(g => g.id !== id);
                        }
                    })
                );
                try { await queryFulfilled; } catch { patch.undo(); }
            },
        }),

        // Contacts
        listContacts: builder.query<ApiSuccess<Paginated<Contact>> | Paginated<Contact> | ApiFail, ListParams | void>({
            query: (params) => params ? ({ url: "/user/contact/", params: params as Record<string, string | number | boolean | undefined> }) : ({ url: "/user/contact/" }),
            providesTags: ["Contacts"],
        }),
        createContact: builder.mutation<ApiSuccess<Contact> | ApiFail, { name: string; groups: number[]; data?: Record<string, unknown> }>({
            query: (body) => ({ url: "/user/contact/", method: "POST", body }),
            invalidatesTags: ["Contacts"],
        }),
        getContact: builder.query<ApiSuccess<Contact> | ApiFail, number>({
            query: (id) => ({ url: `/user/contact/${id}/` }),
            providesTags: ["Contacts"],
        }),
        updateContact: builder.mutation<ApiSuccess<Contact> | ApiFail, { id: number; changes: Partial<Omit<Contact, 'id'>> }>({
            query: ({ id, changes }) => ({ url: `/user/contact/${id}/`, method: "PATCH", body: changes }),
            invalidatesTags: ["Contacts"],
            // With server-side pagination, rely on invalidation instead of patching unknown pages
        }),
        deleteContact: builder.mutation<ApiSuccess<unknown> | ApiFail, number>({
            query: (id) => ({ url: `/user/contact/${id}/`, method: "DELETE" }),
            invalidatesTags: ["Contacts"],
            // Rely on invalidation to refresh paged caches
        }),

        // Transactions
        listTransactions: builder.query<ApiSuccess<Paginated<Transaction>> | Paginated<Transaction> | ApiFail, ListParams | void>({
            query: (params) => params ? ({ url: "/user/transaction/", params: params as Record<string, string | number | boolean | undefined> }) : ({ url: "/user/transaction/" }),
            providesTags: ["Transactions"],
        }),
        createTransaction: builder.mutation<ApiSuccess<Transaction> | ApiFail, Omit<Transaction, "id" | "pending_amount" | "repayments">>({
            query: (body) => ({ url: "/user/transaction/", method: "POST", body }),
            invalidatesTags: ["Transactions"],
        }),
        getTransaction: builder.query<ApiSuccess<Transaction> | ApiFail, number>({
            query: (id) => ({ url: `/user/transaction/${id}/` }),
            providesTags: ["Transactions"],
        }),
        updateTransaction: builder.mutation<ApiSuccess<Transaction> | ApiFail, { id: number; changes: Partial<Omit<Transaction, 'id' | 'repayments' | 'pending_amount'>> }>({
            query: ({ id, changes }) => ({ url: `/user/transaction/${id}/`, method: "PATCH", body: changes }),
            invalidatesTags: ["Transactions"],
            // Use invalidation; paging makes targeted patching non-trivial
        }),
        deleteTransaction: builder.mutation<ApiSuccess<unknown> | ApiFail, number>({
            query: (id) => ({ url: `/user/transaction/${id}/`, method: "DELETE" }),
            invalidatesTags: ["Transactions", "Repayments"],
            // Rely on invalidation to refresh
        }),

        // Repayments
        listRepayments: builder.query<ApiSuccess<Paginated<Repayment>> | Paginated<Repayment> | ApiFail, ListParams | void>({
            query: (params) => params ? ({ url: "/user/repayment/", params: params as Record<string, string | number | boolean | undefined> }) : ({ url: "/user/repayment/" }),
            providesTags: ["Repayments"],
        }),
        createRepayment: builder.mutation<ApiSuccess<Repayment> | ApiFail, Omit<Repayment, "id" | "date"> & { date?: string }>({
            query: (body) => ({ url: "/user/repayment/", method: "POST", body }),
            invalidatesTags: ["Repayments", "Transactions"],
        }),
        getRepayment: builder.query<ApiSuccess<Repayment> | ApiFail, number>({
            query: (id) => ({ url: `/user/repayment/${id}/` }),
            providesTags: ["Repayments"],
        }),
        updateRepayment: builder.mutation<ApiSuccess<Repayment> | ApiFail, { id: number; changes: Partial<Omit<Repayment, 'id'>> }>({
            query: ({ id, changes }) => ({ url: `/user/repayment/${id}/`, method: "PATCH", body: changes }),
            invalidatesTags: ["Repayments", "Transactions"],
            // Invalidate instead of patching paginated caches
        }),
        deleteRepayment: builder.mutation<ApiSuccess<unknown> | ApiFail, number>({
            query: (id) => ({ url: `/user/repayment/${id}/`, method: "DELETE" }),
            invalidatesTags: ["Repayments", "Transactions"],
            // Rely on invalidation to refresh
        }),
    }),
});

export const {
    useLoginMutation: useApiLoginMutation,
    useLogoutMutation: useApiLogoutMutation,
    useSignUpMutation: useApiSignUpMutation,
    useProfileQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
    useListContactGroupsQuery,
    useCreateContactGroupMutation,
    useGetContactGroupQuery,
    useUpdateContactGroupMutation,
    useDeleteContactGroupMutation,
    useListContactsQuery,
    useCreateContactMutation,
    useGetContactQuery,
    useUpdateContactMutation,
    useDeleteContactMutation,
    useListTransactionsQuery,
    useCreateTransactionMutation,
    useGetTransactionQuery,
    useUpdateTransactionMutation,
    useDeleteTransactionMutation,
    useListRepaymentsQuery,
    useCreateRepaymentMutation,
    useGetRepaymentQuery,
    useUpdateRepaymentMutation,
    useDeleteRepaymentMutation,
} = payFirstApi;