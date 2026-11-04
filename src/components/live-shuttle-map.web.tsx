import 'leaflet/dist/leaflet.css';

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const uiuLocation: [number, number] = [23.8223, 90.3654];

type LeafletModule = typeof import('leaflet');
type ReactLeafletModule = typeof import('react-leaflet');

export function LiveShuttleMap() {
  const [mapModules, setMapModules] = useState<{
    leaflet: LeafletModule;
    reactLeaflet: ReactLeafletModule;
  } | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([import('leaflet'), import('react-leaflet')]).then(
      ([leaflet, reactLeaflet]) => {
        if (active) {
          setMapModules({ leaflet: leaflet.default, reactLeaflet });
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const mapContent = mapModules ? (
    <MapContent leaflet={mapModules.leaflet} reactLeaflet={mapModules.reactLeaflet} />
  ) : (
    <View style={styles.loading}>
      <ThemedText style={styles.description}>Loading live map...</ThemedText>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.mapHeader}>
        <View>
          <ThemedText style={styles.title}>Live shuttle location</ThemedText>
          <ThemedText style={styles.description}>Demo location near UIU campus</ThemedText>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>LIVE</ThemedText>
        </View>
      </View>
      <View style={styles.map}>{mapContent}</View>
    </View>
  );
}

function MapContent({
  leaflet,
  reactLeaflet,
}: {
  leaflet: LeafletModule;
  reactLeaflet: ReactLeafletModule;
}) {
  const { MapContainer, Marker, Popup, TileLayer } = reactLeaflet;
  const shuttleIcon = leaflet.divIcon({
    className: 'uiu-shuttle-marker',
    html: '<span>🚌</span>',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

  return (
    <MapContainer center={uiuLocation} zoom={15} scrollWheelZoom={false} style={styles.leafletMap}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={uiuLocation} icon={shuttleIcon}>
        <Popup>UIU Shuttle · Demo GPS location</Popup>
      </Marker>
      <LocationLayer leaflet={leaflet} reactLeaflet={reactLeaflet} />
    </MapContainer>
  );
}

function LocationLayer({
  leaflet,
  reactLeaflet,
}: {
  leaflet: LeafletModule;
  reactLeaflet: ReactLeafletModule;
}) {
  const { Marker, Popup, useMap } = reactLeaflet;
  const map = useMap();
  const [tracking, setTracking] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('Share your location to follow your position live.');
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (!tracking) {
      return;
    }

    if (!navigator.geolocation) {
      setMessage('Location is not supported by this browser.');
      setTracking(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const nextPosition: [number, number] = [coords.latitude, coords.longitude];
        setPosition(nextPosition);
        setMessage('Your location is updating live.');
        if (!hasCentered) {
          map.setView(nextPosition, 16);
          setHasCentered(true);
        }
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow it in your browser settings.'
            : 'Unable to get your current location.',
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasCentered, map, tracking]);

  const userIcon = leaflet.divIcon({
    className: 'uiu-user-marker',
    html: '<span style="display:block;width:18px;height:18px;border:4px solid #FFFFFF;border-radius:50%;background:#FF6500;box-shadow:0 0 0 4px rgba(255,101,0,0.35),0 2px 8px rgba(0,0,0,0.45);"></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  return (
    <>
      <View style={styles.locationControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show my live location"
          onPress={() => {
            setHasCentered(false);
            setTracking(true);
            setMessage('Requesting your location permission...');
          }}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <ThemedText style={styles.locationButtonText}>
            {tracking ? 'Location live' : 'My location'}
          </ThemedText>
        </Pressable>
        <ThemedText style={styles.locationMessage}>{message}</ThemedText>
      </View>
      {position && (
        <Marker position={position} icon={userIcon}>
          <Popup>Your live location</Popup>
        </Marker>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#18202C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: '#B9BDC7',
    fontSize: 12,
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#173A2D',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38D98B',
  },
  liveText: {
    color: '#38D98B',
    fontSize: 11,
    fontWeight: '700',
  },
  map: {
    height: 340,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18202C',
  },
  leafletMap: {
    width: '100%',
    height: '100%',
  },
  locationControl: {
    position: 'absolute',
    zIndex: 1000,
    top: 12,
    right: 12,
    width: 190,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 14, 18, 0.9)',
  },
  locationButton: {
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FF6500',
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  locationMessage: {
    color: '#D5D7DD',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.75,
  },
});
