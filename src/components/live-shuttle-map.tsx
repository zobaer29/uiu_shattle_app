import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';

const uiuLocation = { latitude: 23.7979, longitude: 90.4497 };
const api = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://uiu-shuttle-backend.onrender.com';

const NativeWebView = WebView as unknown as React.ComponentType<any>;

export function LiveShuttleMap({ routeId }: { routeId: string }) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    let isActive = true;

    async function initUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Get initial quick position
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then((loc) => {
            if (!isActive) return;
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserCoords(coords);
            injectUserLocation(coords.latitude, coords.longitude);
          })
          .catch(() => undefined);

        // Watch live position updates
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            if (!isActive) return;
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserCoords(coords);
            injectUserLocation(coords.latitude, coords.longitude);
          },
        );
      } catch {
        // Location not available
      }
    }

    initUserLocation();

    return () => {
      isActive = false;
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, []);

  function injectUserLocation(lat: number, lng: number) {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateUserLocation === 'function') {
          window.updateUserLocation(${lat}, ${lng});
        }
        true;
      `);
    }
  }

  // Update selected route in WebView
  useEffect(() => {
    if (webViewRef.current && routeId) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.setSelectedRoute === 'function') {
          window.setSelectedRoute('${routeId}');
        }
        true;
      `);
    }
  }, [routeId]);

  function handleCenterOnUser() {
    if (userCoords && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.focusUser === 'function') {
          window.focusUser();
        }
        true;
      `);
    }
  }

  function handleCenterOnCampus() {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.focusCampus === 'function') {
          window.focusCampus();
        }
        true;
      `);
    }
  }

  const htmlContent = useMemo(
    () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>UIU Shuttle Live Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0D0E12; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
    .leaflet-control-attribution { display: none !important; }
    
    @keyframes uiu-pulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.35); opacity: 0.25; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .pulse-ring-orange {
      position: absolute; width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255, 101, 0, 0.3); border: 1.5px solid rgba(255, 101, 0, 0.7);
      animation: uiu-pulse 2s infinite ease-in-out;
    }
    .pulse-ring-green {
      position: absolute; width: 40px; height: 40px; border-radius: 50%;
      background: rgba(16, 185, 129, 0.3); border: 1.5px solid rgba(16, 185, 129, 0.7);
      animation: uiu-pulse 2s infinite ease-in-out;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const uiuLat = ${uiuLocation.latitude};
    const uiuLng = ${uiuLocation.longitude};
    const apiUrl = '${api}';
    let currentRouteId = '${routeId}';

    const map = L.map('map', {
      center: [uiuLat, uiuLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Dark clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // UIU Campus Marker
    const uiuIcon = L.divIcon({
      className: 'uiu-marker',
      html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
            '<div style="background:#1E293B;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;border:1px solid #FF6500;white-space:nowrap;margin-bottom:3px;box-shadow:0 2px 4px rgba(0,0,0,0.5);">🎓 UIU Campus</div>' +
            '<div style="width:26px;height:26px;background:#FF6500;border:3px solid #FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-size:13px;">🏫</div>' +
            '</div>',
      iconSize: [80, 52],
      iconAnchor: [40, 48]
    });
    L.marker([uiuLat, uiuLng], { icon: uiuIcon }).addTo(map).bindPopup('<b>United International University</b><br>Madani Avenue, Dhaka');

    // User Marker
    let userMarker = null;
    let userLat = null;
    let userLng = null;

    const userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;">' +
            '<div style="background:#FF6500;color:#FFFFFF;font-weight:800;font-size:10px;padding:2px 7px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.5);white-space:nowrap;margin-bottom:4px;border:1.5px solid #FFFFFF;">📍 You (Live)</div>' +
            '<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">' +
            '<div class="pulse-ring-orange"></div>' +
            '<div style="width:16px;height:16px;border-radius:50%;background:#FF6500;border:3px solid #FFFFFF;box-shadow:0 0 10px rgba(255,101,0,0.8);z-index:10;"></div>' +
            '</div></div>',
      iconSize: [80, 52],
      iconAnchor: [40, 48]
    });

    window.updateUserLocation = function(lat, lng) {
      userLat = lat;
      userLng = lng;
      if (!userMarker) {
        userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        userMarker.bindPopup('<b>Your Current Location</b><br>Live GPS Signal');
      } else {
        userMarker.setLatLng([lat, lng]);
      }
    };

    window.focusUser = function() {
      if (userLat && userLng) {
        map.setView([userLat, userLng], 16, { animate: true });
      }
    };

    window.focusCampus = function() {
      map.setView([uiuLat, uiuLng], 15, { animate: true });
    };

    window.setSelectedRoute = function(routeId) {
      currentRouteId = routeId;
      refreshTrips();
    };

    // Driver / Shuttle markers
    const shuttleMarkers = new Map();

    const driverIcon = L.divIcon({
      className: 'driver-marker',
      html: '<div style="position:relative;display:flex;flex-direction:column;align-items:center;">' +
            '<div style="background:#059669;color:#FFFFFF;font-weight:800;font-size:10px;padding:2px 7px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.5);white-space:nowrap;margin-bottom:4px;border:1.5px solid #FFFFFF;">🚌 Shuttle (Live)</div>' +
            '<div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">' +
            '<div class="pulse-ring-green"></div>' +
            '<div style="width:22px;height:22px;border-radius:50%;background:#10B981;border:3px solid #FFFFFF;box-shadow:0 0 10px rgba(16,185,129,0.8);z-index:8;display:flex;align-items:center;justify-content:center;font-size:11px;">🚌</div>' +
            '</div></div>',
      iconSize: [100, 56],
      iconAnchor: [50, 52]
    });

    function updateShuttleMarker(tripId, lat, lng, routeName) {
      if (!lat || !lng) return;
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng)) return;

      if (shuttleMarkers.has(tripId)) {
        const marker = shuttleMarkers.get(tripId);
        marker.setLatLng([numLat, numLng]);
      } else {
        const marker = L.marker([numLat, numLng], { icon: driverIcon, zIndexOffset: 900 }).addTo(map);
        marker.bindPopup('<b>UIU Shuttle Bus</b><br>' + (routeName || 'Active Route'));
        shuttleMarkers.set(tripId, marker);
      }
    }

    function removeShuttleMarker(tripId) {
      if (shuttleMarkers.has(tripId)) {
        map.removeLayer(shuttleMarkers.get(tripId));
        shuttleMarkers.delete(tripId);
      }
    }

    function refreshTrips() {
      fetch(apiUrl + '/trips/active')
        .then(r => r.json())
        .then(trips => {
          if (!Array.isArray(trips)) return;
          const activeIds = new Set();
          trips.forEach(t => {
            const matchesRoute = !currentRouteId || t.route_id === currentRouteId;
            if (matchesRoute && t.latitude && t.longitude) {
              activeIds.add(t.id);
              updateShuttleMarker(t.id, t.latitude, t.longitude, t.route_name);
            }
          });

          // Remove completed / other route trips
          for (const [id] of shuttleMarkers) {
            if (!activeIds.has(id)) {
              removeShuttleMarker(id);
            }
          }
        })
        .catch(() => undefined);
    }

    refreshTrips();

    // Real-time Socket.IO connection
    try {
      const socket = io(apiUrl + '/shuttle-stream', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10
      });

      socket.on('shuttle:locationUpdate', data => {
        if (!data || !data.tripId) return;
        const matchesRoute = !currentRouteId || data.routeId === currentRouteId;
        if (matchesRoute) {
          updateShuttleMarker(data.tripId, data.latitude, data.longitude, 'Live Route');
        }
      });

      socket.on('shuttle:statusUpdate', () => {
        refreshTrips();
      });
    } catch(e) {}
  </script>
</body>
</html>
`,
    [],
  );

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.mapHeader}>
        <View>
          <ThemedText style={styles.title}>Live shuttle location</ThemedText>
          <ThemedText style={styles.description}>Driver locations update live while trips are active.</ThemedText>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <ThemedText style={styles.liveText}>LIVE</ThemedText>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <NativeWebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webView}
          onLoadEnd={() => {
            setLoading(false);
            if (userCoords) {
              injectUserLocation(userCoords.latitude, userCoords.longitude);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={false}
          scrollEnabled={false}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#FF6500" />
            <ThemedText style={styles.loadingText}>Loading interactive map...</ThemedText>
          </View>
        )}

        {/* Quick Map Floating Controls */}
        <View style={styles.controlsBar}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCenterOnUser}
            style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.controlButtonText}>📍 My Location</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleCenterOnCampus}
            style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
          >
            <ThemedText style={styles.controlButtonText}>🎓 UIU Campus</ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
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
  mapContainer: {
    height: 350,
    position: 'relative',
    backgroundColor: '#0D0E12',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0D0E12',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#18202C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#B9BDC7',
    fontSize: 13,
  },
  controlsBar: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(15, 20, 32, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
