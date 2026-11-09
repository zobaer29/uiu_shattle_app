import { configureStore } from '@reduxjs/toolkit';
import { tripReducer } from './trip-session';

export const store = configureStore({
  reducer: { tripSession: tripReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
