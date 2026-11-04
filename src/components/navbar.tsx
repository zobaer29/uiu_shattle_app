import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

export function Navbar() {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View accessible accessibilityLabel="UIU logo" style={styles.logo}>
          <Image
            contentFit="contain"
            source={require("@/assets/images/logo/uiu-logo.webp")}
            style={styles.logoImage}
          />
        </View>
        <ThemedText type="smallBold" style={styles.brandText}>
          UIU Shuttle Tracking
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open login page"
        onPress={() => router.push("/login")}
        style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
      >
        <View style={styles.loginButtonContent}>
          <ThemedText style={styles.loginText}>Login</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#2F3033",
    borderRadius: 30,
    paddingHorizontal: Spacing.two,
    backgroundColor: "#111214",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexShrink: 1,
  },
  logo: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: "#208AEF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  brandText: {
    flexShrink: 1,
  },
  loginButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginLeft: Spacing.two,
  },
  loginButtonContent: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: "#FF6500",
  },
  loginText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.75,
  },
});
