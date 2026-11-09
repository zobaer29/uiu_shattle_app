import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Navbar } from "@/components/navbar";
import { ScheduleModal } from "@/components/schedule-modal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";

export default function HomeScreen() {
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView style={styles.safeArea}>
          <Navbar />

          <View style={styles.hero}>
            <Image
              accessibilityLabel="UIU campus shuttle at night"
              contentFit="contain"
              contentPosition="center"
              source={require("@/assets/images/logo/hero.png")}
              style={styles.heroImage}
            />

            <View style={styles.copy}>
              <View style={styles.status}>
                <View style={styles.onlineDot} />
                <ThemedText style={styles.statusText}>
                  Shuttle network online
                </ThemedText>
                <ThemedText style={styles.statusArrow}>-&gt;</ThemedText>
              </View>
              <ThemedText type="title" style={styles.title}>
                UIU Shuttle{"\n"}
                <ThemedText style={styles.titleAccent}>
                  Tracking System
                </ThemedText>
              </ThemedText>
              <ThemedText style={styles.description}>
                Find your shuttle, check live routes, and get to United
                International University on time.
              </ThemedText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in to shuttle tracker"
                onPress={() => router.push("/login")}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Sign in to tracker
                </ThemedText>
                <ThemedText style={styles.primaryButtonArrow}>-&gt;</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Time Schedule of Shuttle Services"
                onPress={() => setScheduleModalVisible(true)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.manualIcon}>📄</ThemedText>
                <ThemedText style={styles.secondaryButtonText}>
                  Time Schedule of Shuttle Services
                </ThemedText>
              </Pressable>

              <ThemedText style={styles.hint}>
                Sign in with your UIU ID and password.
              </ThemedText>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              © 2026 · UIU Shuttle Tracking
            </ThemedText>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0E12",
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    flexGrow: 1,
  },
  hero: {
    flexGrow: 1,
  },
  heroImage: {
    width: "100%",
    aspectRatio: 941 / 1179,
    marginHorizontal: -Spacing.three,
    marginTop: Spacing.three,
    backgroundColor: "transparent",
  },
  copy: {
    paddingTop: Spacing.four,
    backgroundColor: "transparent",
  },
  status: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: "#303238",
    borderRadius: 18,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#00D26A",
  },
  statusText: {
    color: "#9899A0",
    fontSize: 12,
  },
  statusArrow: {
    color: "#9899A0",
    fontSize: 14,
  },
  title: {
    color: "#F8F8F8",
    fontSize: 34,
    lineHeight: 39,
    marginTop: Spacing.three,
  },
  titleAccent: {
    color: "#FF6500",
    fontSize: 34,
    lineHeight: 39,
  },
  description: {
    color: "#9B9A9D",
    fontSize: 15,
    lineHeight: 23,
    marginTop: Spacing.two,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: Spacing.four,
    borderRadius: 28,
    backgroundColor: "#FF6500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  primaryButtonArrow: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  secondaryButton: {
    minHeight: 46,
    marginTop: Spacing.two,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#3A3A3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  manualIcon: {
    color: "#D7D7D9",
    fontSize: 12,
  },
  secondaryButtonText: {
    color: "#D7D7D9",
  },
  hint: {
    color: "#7D7D83",
    fontSize: 12,
    marginTop: Spacing.two,
  },
  footer: {
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "#2A2A2D",
    paddingVertical: Spacing.two,
    marginTop: Spacing.five,
  },
  footerText: {
    color: "#77777D",
    fontSize: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});
