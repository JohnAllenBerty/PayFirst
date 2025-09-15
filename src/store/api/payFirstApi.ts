import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { toast } from "react-toastify";

async function handle401Response() {
    const { store } = await import('../store');
    const { openLoginModal } = await import('../slices/loginSlice'); // Assuming openLoginModal is also dynamically imported if needed
    store.dispatch(openLoginModal());
}

async function handle500Response() {
    const { store } = await import('../store');
    const { setError } = await import('../slices/errorSlice'); // Assuming openLoginModal is also dynamically imported if needed
    store.dispatch(setError('500'));
    toast.error('Internal Server Error');
}

const baseQuery = fetchBaseQuery({
    baseUrl: '/', // Use the proxy path
    prepareHeaders: (headers) => {
        headers.set("Authorization", `Bearer ${localStorage.getItem("token")}`);
        headers.set('Access-Control-Allow-Origin', '*');
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

const customBaseQuery = async (args: any, api: any, extraOptions: any) => {
    const result = await baseQuery(args, api, extraOptions);

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
        "PayFirst",
    ],
    endpoints: () => ({}),
});