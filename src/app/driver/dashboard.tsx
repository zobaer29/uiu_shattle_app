import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RootState } from '@/store';
import { clearTrip, setTrip } from '@/store/trip-session';

export default function DriverDashboard() {
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const dispatch = useDispatch();
  const tripId = useSelector((state: RootState) => state.tripSession.tripId);
  const hydrated = useSelector((state: RootState) => state.tripSession.hydrated);
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [routeName, setRouteName] = useState('Loading route...');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const api = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

  useEffect(() => {
    AsyncStorage.getItem('uiu_shuttle_token').then((savedToken) => {
      setToken(savedToken);
    });
  }, []);

  useEffect(() => {
    Promise.all([fetch(`${api}/routes`).then((response) => response.json()), fetch(`${api}/buses`).then((response) => response.json())])
      .then(([routes, buses]) => {
        setRouteId(routes[0]?.id ?? '');
        setRouteName(routes[0]?.name ?? 'No route assigned');
        setBusId(buses[0]?.id ?? '');
      })
      .catch(() => {
        setRouteName('Unable to load route');
        setMessage('Make sure the backend and database are running.');
      })
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (!driverId || !hydrated) return;
    fetch(`${api}/trips/active`)
      .then((response) => response.json())
      .then((trips: { id: string; driver_id: string }[]) => {
        const activeTrip = trips.find((trip) => trip.driver_id === driverId);
        if (activeTrip) dispatch(setTrip(activeTrip.id));
        else dispatch(clearTrip());
      })
      .catch(() => undefined);
  }, [api, dispatch, driverId, hydrated]);

  useEffect(() => {
    if (!tripId) return;

    let subscriber: Location.LocationSubscription | null = null;
    let isActive = true;

    async function startDriverTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isActive) setMessage('Trip started, but location permission was denied.');
          return;
        }

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            if (!isActive) return;
            const payload = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              ...(Number.isFinite(loc.coords.accuracy) && loc.coords.accuracy !== null && loc.coords.accuracy >= 0
                ? { accuracyMeters: loc.coords.accuracy }
                : {}),
            };
            fetch(`${api}/trips/${tripId}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(payload),
            })
              .then(async (response) => {
                if (!response.ok && isActive) {
                  const result = await response.json().catch(() => null);
                  setMessage(result?.message?.join?.(', ') ?? 'Unable to send location update.');
                }
              })
              .catch(() => {
                if (isActive) setMessage('Unable to connect to the location service.');
              });
          },
        );
      } catch {
        if (isActive) setMessage('Unable to start GPS tracking on device.');
      }
    }

    startDriverTracking();

    return () => {
      isActive = false;
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [api, token, tripId]);

  async function toggleTrip() {
    if (submitting) return;
    setMessage('');
    setSubmitting(true);
    try {
      if (tripId) {
        const response = await fetch(`${api}/trips/${tripId}/end`, {
          method: 'PUT',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!response.ok) throw new Error('Unable to end trip');
        dispatch(clearTrip());
        setMessage('Trip ended successfully.');
        return;
      }

      const response = await fetch(`${api}/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ routeId, busId, driverId, direction: 'outbound' }),
      });
      if (!response.ok) throw new Error('Unable to start trip');
      dispatch(setTrip((await response.json()).id));
      setMessage('Trip started. Your route is now active.');
    } catch (tripError) {
      setMessage(tripError instanceof Error ? tripError.message : 'Trip request failed');
    } finally {
      setSubmitting(false);
    }

  }

  async function cancelTrip() {
    if (!tripId || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`${api}/trips/${tripId}/cancel`, {
        method: 'PUT',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) throw new Error('Unable to cancel trip');
      dispatch(clearTrip());
      setMessage('Trip canceled.');
    } catch (tripError) {
      setMessage(tripError instanceof Error ? tripError.message : 'Trip cancellation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SafeAreaView>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.eyebrow}>DRIVER DASHBOARD</ThemedText>
              <ThemedText type="subtitle">Today&apos;s service</ThemedText>
            </View>
            <Pressable onPress={() => router.replace('/login')}>
              <ThemedText style={styles.logout}>Logout</ThemedText>
            </Pressable>
          </View>
          <View style={styles.card}>
            <ThemedText style={styles.label}>ASSIGNED ROUTE</ThemedText>
            <ThemedText type="subtitle">{routeName}</ThemedText>
            <ThemedText style={styles.muted}>{tripId ? 'Trip is active' : 'Ready to start a trip'}</ThemedText>
            <Pressable style={[styles.button, (loading || submitting || !hydrated) && styles.disabledButton]} onPress={toggleTrip} disabled={loading || submitting || !hydrated || !routeId || !busId || !driverId}>
              <ThemedText style={styles.buttonText}>{loading ? 'Loading...' : submitting ? 'Saving...' : tripId ? 'End trip' : 'Start trip'}</ThemedText>
            </Pressable>
            {tripId ? <Pressable style={styles.cancelButton} onPress={cancelTrip} disabled={submitting}><ThemedText style={styles.cancelText}>Cancel trip</ThemedText></Pressable> : null}
            {message ? <ThemedText style={styles.message}>{message}</ThemedText> : null}
          </View>
          <View style={styles.card}>
            <ThemedText style={styles.label}>OCCUPANCY</ThemedText>
            <ThemedText style={styles.occupancy}>0 / 40</ThemedText>
            <ThemedText style={styles.muted}>Update passenger count during your trip.</ThemedText>
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0E12' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { color: '#FF6500', fontSize: 11, letterSpacing: 1.5 },
  logout: { color: '#FF9A8B' },
  card: { padding: 20, marginBottom: 16, borderRadius: 18, backgroundColor: '#18202C' },
  label: { color: '#9B9A9D', fontSize: 11, letterSpacing: 1.2 },
  muted: { color: '#B9BDC7', marginTop: 8 },
  occupancy: { color: '#FFFFFF', fontSize: 36, fontWeight: '700', marginTop: 12 },
  button: { marginTop: 20, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#FF6500' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  message: { color: '#B9BDC7', marginTop: 12 },
  cancelButton: { marginTop: 12, padding: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#B84C4C' },
  cancelText: { color: '#FF9A8B', fontWeight: '700' },
});
