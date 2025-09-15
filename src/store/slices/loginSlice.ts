import { createSlice } from "@reduxjs/toolkit";

export const loginSlice = createSlice({
    name: 'login',
    initialState: {
        loginModalOpen: false,
    },
    reducers: {
        openLoginModal: (state) => {
            state.loginModalOpen = true;
        },
        closeLoginModal: (state) => {
            state.loginModalOpen = false;
        },
    },
});

export const { openLoginModal, closeLoginModal } = loginSlice.actions;
export default loginSlice.reducer;