import { configureStore } from '@reduxjs/toolkit'
import { authApi } from './api/authApi'

export const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware),
})

// types for use throughout the app
export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>