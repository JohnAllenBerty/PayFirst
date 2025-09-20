import { configureStore } from '@reduxjs/toolkit'
import { payFirstApi } from './api/payFirstApi'
import loginReducer from './slices/loginSlice'
import errorReducer from './slices/errorSlice'

export const store = configureStore({
    reducer: {
        [payFirstApi.reducerPath]: payFirstApi.reducer,
        login: loginReducer,
        error: errorReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(payFirstApi.middleware),
})

// types for use throughout the app
export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>