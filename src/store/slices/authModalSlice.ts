import { createSlice } from "@reduxjs/toolkit";

interface AuthModalState {
  open: boolean;
  reason: string | null;
}

const initialState: AuthModalState = {
  open: false,
  reason: null,
};

export const authModalSlice = createSlice({
  name: 'authModal',
  initialState,
  reducers: {
    openAuthModal: (state, action) => {
      state.open = true;
      state.reason = typeof action.payload === 'string' ? action.payload : null;
    },
    closeAuthModal: (state) => {
      state.open = false;
      state.reason = null;
    },
  },
});

export const { openAuthModal, closeAuthModal } = authModalSlice.actions;
export default authModalSlice.reducer;
