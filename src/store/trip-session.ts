import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const storageKey = 'uiu-shuttle-active-trip';

type TripSession = {
  tripId: string | null;
  hydrated: boolean;
};

const initialState: TripSession = { tripId: null, hydrated: false };

const tripSlice = createSlice({
  name: 'tripSession',
  initialState,
  reducers: {
    hydrateTrip(state, action: PayloadAction<string | null>) {
      state.tripId = action.payload;
      state.hydrated = true;
    },
    setTrip(state, action: PayloadAction<string>) {
      state.tripId = action.payload;
      void AsyncStorage.setItem(storageKey, action.payload);
    },
    clearTrip(state) {
      state.tripId = null;
      void AsyncStorage.removeItem(storageKey);
    },
  },
});

export const { hydrateTrip, setTrip, clearTrip } = tripSlice.actions;
export const tripReducer = tripSlice.reducer;
export { storageKey };
