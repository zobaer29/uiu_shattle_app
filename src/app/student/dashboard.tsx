import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LiveShuttleMap } from "@/components/live-shuttle-map";
import { ScheduleModal } from "@/components/schedule-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";

export default function StudentDashboard() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const [routes, setRoutes] = useState<Array<{ id: string; name: string }>>([]);
  const [locationMessage, setLocationMessage] = useState("Location sharing is off");
  const [token, setToken] = useState<string | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("uiu_shuttle_token").then((savedToken) => {
      setToken(savedToken);
    });
  }, []);

  useEffect(() => {
    if (!studentId) {
      return;
    }

    let subscriber: Location.LocationSubscription | null = null;
    let isActive = true;

    async function setupLocation() {
      try {
        setLocationMessage("Requesting location permission...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isActive) setLocationMessage("Location permission was denied");
          return;
        }

        if (isActive) setLocationMessage("Your location is shared live");

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isActive) return;
            const api = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
            fetch(`${api}/students/location`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                studentId,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                ...(Number.isFinite(loc.coords.accuracy) && loc.coords.accuracy !== null && loc.coords.accuracy >= 0
                  ? { accuracyMeters: loc.coords.accuracy }
                  : {}),
              }),
            })
              .then((response) => {
                if (isActive) {
                  setLocationMessage(response.ok ? "Your location is shared live" : "Unable to share your location");
                }
              })
              .catch(() => {
                if (isActive) setLocationMessage("Unable to connect to location service");
              });
          },
        );
      } catch {
        if (isActive) setLocationMessage("Unable to connect to location service");
      }
    }

    setupLocation();

    return () => {
      isActive = false;
      if (subscriber) {
        subscriber.remove();
      }
    };
  }, [studentId, token]);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/routes`)
      .then((response) => response.json())
      .then((items: { id: string; name: string }[]) => setRoutes(items))
      .catch(() => setRoutes([]));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <Image
        accessibilityLabel="UIU campus shuttle at night"
        contentFit="cover"
        source={require("@/assets/images/logo/hero.png")}
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.eyebrow}>STUDENT DASHBOARD</ThemedText>
              <ThemedText type="subtitle" style={styles.title}>
                Hello, UIU student
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Return to home"
              onPress={() => router.replace("/")}
              style={({ pressed }) => [
                styles.homeButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.homeButtonText}>Logout</ThemedText>
            </Pressable>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <ThemedText style={styles.statusIconText}>●</ThemedText>
            </View>
            <View style={styles.statusCopy}>
              <ThemedText style={styles.cardLabel}>SHUTTLE NETWORK</ThemedText>
              <ThemedText style={styles.cardTitle}>
                All services are online
              </ThemedText>
              <ThemedText style={styles.cardDescription}>
                Track your next UIU shuttle and plan your trip with confidence.
              </ThemedText>
              <ThemedText style={styles.locationStatus}>{locationMessage}</ThemedText>
            </View>
          </View>

          {/* Official Schedule PDF Banner */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Time Schedule of Shuttle Services PDF and departures"
            onPress={() => setScheduleModalVisible(true)}
            style={({ pressed }) => [
              styles.scheduleBanner,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.scheduleBannerIcon}>
              <ThemedText style={styles.scheduleBannerIconText}>📄</ThemedText>
            </View>
            <View style={styles.scheduleBannerCopy}>
              <View style={styles.scheduleBannerBadgeRow}>
                <ThemedText style={styles.scheduleBannerBadge}>OFFICIAL TIMETABLE</ThemedText>
                <ThemedText style={styles.scheduleBannerLiveBadge}>PDF Available</ThemedText>
              </View>
              <ThemedText style={styles.scheduleBannerTitle}>
                Time Schedule of Shuttle Services
              </ThemedText>
              <ThemedText style={styles.scheduleBannerSub}>
                View departures or download the official admin circular PDF
              </ThemedText>
            </View>
            <ThemedText style={styles.scheduleBannerArrow}>→</ThemedText>
          </Pressable>

          <View style={styles.mapArea}>
            <RouteSelector routes={routes} />
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quick access
            </ThemedText>
            <ThemedText style={styles.sectionHint}>Live services</ThemedText>
          </View>

          <View style={styles.grid}>
            <DashboardCard
              title="Live shuttle"
              description="See shuttles on the map"
              icon="↗"
            />
            <DashboardCard
              title="Schedule"
              description="Check route departure times"
              icon="◷"
              onPress={() => setScheduleModalVisible(true)}
            />
            <DashboardCard
              title="My routes"
              description="Save your regular routes"
              icon="☆"
            />
            <DashboardCard
              title="Announcements"
              description="Get the latest updates"
              icon="!"
            />
          </View>
        </SafeAreaView>
      </ScrollView>

      <ScheduleModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
      />
    </ThemedView>
  );
}

function RouteSelector({ routes }: { routes: Array<{ id: string; name: string }> }) {
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [routeMenuOpen, setRouteMenuOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!selectedRouteId && routes.length) setSelectedRouteId(routes[0].id);
  }, [routes, selectedRouteId]);

  const selectedRoute = routes.find((route) => route.id === selectedRouteId);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animation, {
        toValue: routeMenuOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animation, routeMenuOpen]);

  return (
    <View style={styles.routeSection}>
      <View style={styles.glassPanel}>
        <ThemedText style={styles.cardLabel}>SELECT YOUR ROUTE</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Selected route: ${selectedRoute?.name ?? "None"}`}
          accessibilityState={{ expanded: routeMenuOpen }}
          onPress={() => setRouteMenuOpen((open) => !open)}
          style={({ pressed }) => [
            styles.routeSelector,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.routeSelectorText}>
            {selectedRoute?.name ?? "Select a route"}
          </ThemedText>
          <Animated.Text
            style={[
              styles.routeChevron,
              {
                transform: [
                  {
                    rotate: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            ⌄
          </Animated.Text>
        </Pressable>

        <Animated.View
          pointerEvents={routeMenuOpen ? "auto" : "none"}
          style={[
            styles.routeMenu,
            {
              opacity: animation,
              transform: [
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
                {
                  scaleY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {routes.map((route) => (
            <Pressable
              accessibilityRole="menuitem"
              key={route.id}
              onPress={() => {
                setSelectedRouteId(route.id);
                setRouteMenuOpen(false);
              }}
              style={({ pressed }) => [
                styles.routeOption,
                route.id === selectedRouteId && styles.selectedRouteOption,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                style={[
                  styles.routeOptionText,
                  route.id === selectedRouteId && styles.selectedRouteOptionText,
                ]}
              >
                {route.name}
              </ThemedText>
              {route.id === selectedRouteId && (
                <ThemedText style={styles.checkmark}>✓</ThemedText>
              )}
            </Pressable>
          ))}
        </Animated.View>
      </View>
      <LiveShuttleMap routeId={selectedRouteId} />
    </View>
  );
}

function DashboardCard({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.dashboardCard,
        onPress && styles.interactiveCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardIcon}>
        <ThemedText style={styles.cardIconText}>{icon}</ThemedText>
      </View>
      <ThemedText style={styles.dashboardCardTitle}>{title}</ThemedText>
      <ThemedText style={styles.dashboardCardDescription}>
        {description}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0E12",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(5, 8, 18, 0.72)",
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.five,
  },
  eyebrow: {
    color: "#FF8A45",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 38,
    marginTop: Spacing.one,
  },
  homeButton: {
    borderWidth: 1,
    borderColor: "#626672",
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: "rgba(20, 24, 34, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  scheduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: "rgba(25, 30, 46, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 101, 0, 0.4)",
  },
  scheduleBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255, 101, 0, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 101, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleBannerIconText: {
    fontSize: 20,
  },
  scheduleBannerCopy: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  scheduleBannerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  scheduleBannerBadge: {
    color: "#FF8A45",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  scheduleBannerLiveBadge: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "rgba(52, 211, 153, 0.14)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  scheduleBannerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  scheduleBannerSub: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  scheduleBannerArrow: {
    color: "#FF8A45",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: Spacing.two,
  },
  mapArea: {
    marginTop: Spacing.three,
  },
  routeSection: {
    marginBottom: Spacing.three,
  },
  glassPanel: {
    padding: Spacing.two,
    borderRadius: 18,
    backgroundColor: "rgba(13, 18, 28, 0.68)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },
  routeSelector: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  routeSelectorText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  routeChevron: {
    color: "#FF8A45",
    fontSize: 22,
    lineHeight: 22,
  },
  routeMenu: {
    marginTop: Spacing.one,
    padding: Spacing.one,
    borderRadius: 14,
    backgroundColor: "rgba(15, 20, 30, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  routeOption: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
  selectedRouteOption: {
    backgroundColor: "rgba(255, 101, 0, 0.16)",
  },
  routeOptionText: {
    color: "#D5D7DD",
    fontSize: 14,
  },
  selectedRouteOptionText: {
    color: "#FF8A45",
    fontWeight: "700",
  },
  checkmark: {
    color: "#FF8A45",
    fontSize: 16,
    fontWeight: "700",
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#173A2D",
  },
  statusIconText: {
    color: "#38D98B",
    fontSize: 18,
  },
  statusCopy: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  cardLabel: {
    color: "#9CA2B0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: Spacing.one,
  },
  cardDescription: {
    color: "#B9BDC7",
    fontSize: 13,
    lineHeight: 19,
    marginTop: Spacing.one,
  },
  locationStatus: {
    color: "#7DE2A8",
    fontSize: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: Spacing.five,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  sectionHint: {
    color: "#969BA7",
    fontSize: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  dashboardCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 150,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: "rgba(20, 24, 34, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  interactiveCard: {
    borderColor: "rgba(255, 101, 0, 0.35)",
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6500",
  },
  cardIconText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  dashboardCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: Spacing.three,
  },
  dashboardCardDescription: {
    color: "#AEB3BE",
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.75,
  },
});
