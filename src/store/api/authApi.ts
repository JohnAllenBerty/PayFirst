import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://shiny-waddle-46qwv947pvp2qwj6-8000.app.github.dev/' }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: 'login',
        method: 'POST',
        body,
      }),
      onQueryStarted: async (_, { queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          // Handle successful login (e.g., store token)
          localStorage.setItem('token', data.data.token);
        } catch (error) {
          // Handle login error
          console.error('Login failed:', error);
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({
        url: 'logout',
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
      }),
      onQueryStarted: async (_, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Handle successful logout (e.g., remove token)
          localStorage.removeItem('token');
        } catch (error) {
          // Handle logout error
          console.error('Logout failed:', error);
        }
      },
    }),
    signUp: builder.mutation({
      query: (body) => ({
        url: 'signup',
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
  useLogoutMutation
} = authApi