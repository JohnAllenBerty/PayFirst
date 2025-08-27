import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: 'login',
        method: 'POST',
        body,
      }),
    }),
    signUp: builder.mutation({
      query: (body) => ({
        url: 'sign-up',
        method: 'POST',
        body,
      }),
    }),
    fetchCurrentUser: builder.query({
      query: () => 'profile',
    }),
  }),
})

export const {
  useLoginMutation,
  useSignUpMutation,
  useFetchCurrentUserQuery,
  util: authApiUtil,
} = authApi