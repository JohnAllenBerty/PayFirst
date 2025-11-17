import { configureStore } from '@reduxjs/toolkit'
import { payFirstApi } from './api/payFirstApi'
import loginReducer from './slices/loginSlice'
import authModalReducer from './slices/authModalSlice'
import errorReducer from './slices/errorSlice'

export const store = configureStore({
    reducer: {
        [payFirstApi.reducerPath]: payFirstApi.reducer,
        login: loginReducer,
        error: errorReducer,
        authModal: authModalReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(payFirstApi.middleware),
})

// Expose store globally for non-module contexts / late access (e.g., API layer 401 handler without circular import)
try {
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__PAYFIRST_STORE = store
    }
} catch { /* noop */ }

// types for use throughout the app
export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>