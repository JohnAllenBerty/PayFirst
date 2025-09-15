import { payFirstApi } from "../payFirstApi";

const contactApi = payFirstApi.injectEndpoints({
    endpoints: (builder) => ({
        getContacts: builder.query({
            query: () => '/api/contacts',
        }),
        getContactGroups: builder.query({
            query: () => '/api/user/contact-groups',
        }),
    }),
});


export const { useGetContactsQuery, useGetContactGroupsQuery } = contactApi;