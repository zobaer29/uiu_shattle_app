import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store } from './index';
import { hydrateTrip, storageKey } from './trip-session';

function HydrateTripSession() {
  const dispatch = useDispatch();

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((tripId) => dispatch(hydrateTrip(tripId)))
      .catch(() => dispatch(hydrateTrip(null)));
  }, [dispatch]);

  return null;
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <HydrateTripSession />
      {children}
    </Provider>
  );
}
