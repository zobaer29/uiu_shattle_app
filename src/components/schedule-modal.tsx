import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { io } from 'socket.io-client';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export interface ScheduleItem {
  id: string;
  route_id: string;
  route_name?: string;
  direction: 'outbound' | 'return';
  departure_time: string;
  is_active?: boolean;
}

export interface PdfMetadata {
  exists: boolean;
  title?: string;
  filename?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  version?: string;
  uploadedBy?: string;
  url?: string;
}

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ScheduleModal({ visible, onClose }: ScheduleModalProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [pdfInfo, setPdfInfo] = useState<PdfMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'outbound' | 'return'>('all');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  const api = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

  async function loadData() {
    setLoading(true);
    try {
      const [schedRes, pdfRes] = await Promise.all([
        fetch(`${api}/schedules`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(`${api}/schedules/pdf/info`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setSchedules(schedRes || []);
      setPdfInfo(pdfRes);
    } catch {
      // Keep existing state if fetch fails
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  // Connect to real-time socket to update automatically if admin uploads new PDF or changes schedules
  useEffect(() => {
    if (!visible) return;

    const socket = io(`${api}/shuttle-stream`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('schedule:pdfUpdated', (meta: PdfMetadata) => {
      setPdfInfo(meta);
      setLiveNotification('Official timetable PDF was just updated by Admin!');
      setTimeout(() => setLiveNotification(null), 5000);
    });

    socket.on('schedule:updated', () => {
      fetch(`${api}/schedules`)
        .then((r) => (r.ok ? r.json() : []))
        .then((items) => {
          setSchedules(items);
          setLiveNotification('Departure times refreshed in real-time');
          setTimeout(() => setLiveNotification(null), 4000);
        })
        .catch(() => undefined);
    });

    return () => {
      socket.disconnect();
    };
  }, [api, visible]);

  async function handleOpenPdf() {
    const pdfUrl = `${api}/schedules/pdf`;
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(pdfUrl, '_blank');
        } else {
          await Linking.openURL(pdfUrl);
        }
      } else {
        await WebBrowser.openBrowserAsync(pdfUrl);
      }
    } catch (err) {
      try {
        await Linking.openURL(pdfUrl);
      } catch {
        Alert.alert('PDF Viewer', 'Unable to open PDF automatically. Link: ' + pdfUrl);
      }
    }
  }

  // Extract unique route names
  const uniqueRoutes = useMemo(() => {
    const map = new Map<string, string>();
    schedules.forEach((s) => {
      if (s.route_id) {
        map.set(s.route_id, s.route_name || `Route ${s.route_id.substring(0, 4)}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [schedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      const matchDir = selectedDirection === 'all' || item.direction === selectedDirection;
      const matchRoute = selectedRoute === 'all' || item.route_id === selectedRoute;
      return matchDir && matchRoute;
    });
  }, [schedules, selectedDirection, selectedRoute]);

  const formattedUploadTime = useMemo(() => {
    if (!pdfInfo?.uploadedAt) return 'Official Schedule';
    try {
      const date = new Date(pdfInfo.uploadedAt);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Official Schedule';
    }
  }, [pdfInfo]);

  const formattedSize = useMemo(() => {
    if (!pdfInfo?.size) return null;
    return `${(pdfInfo.size / 1024).toFixed(1)} KB`;
  }, [pdfInfo]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerBadge}>
                <ThemedText style={styles.headerBadgeText}>OFFICIAL TIMETABLE</ThemedText>
              </View>
              <ThemedText style={styles.title}>Time Schedule</ThemedText>
              <ThemedText style={styles.subtitle}>UIU Shuttle Bus Services</ThemedText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close schedule modal"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Live Notification Banner */}
          {liveNotification && (
            <View style={styles.notificationBanner}>
              <ThemedText style={styles.notificationDot}>●</ThemedText>
              <ThemedText style={styles.notificationText}>{liveNotification}</ThemedText>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* PDF Download Card */}
            <View style={styles.pdfCard}>
              <View style={styles.pdfCardGlow} />
              <View style={styles.pdfHeader}>
                <View style={styles.pdfIconBadge}>
                  <ThemedText style={styles.pdfIconText}>PDF</ThemedText>
                </View>
                <View style={styles.pdfInfo}>
                  <ThemedText style={styles.pdfTitle}>
                    {pdfInfo?.title || 'Time Schedule of Shuttle Services'}
                  </ThemedText>
                  <View style={styles.pdfMetaRow}>
                    <ThemedText style={styles.pdfMetaBadge}>
                      {pdfInfo?.exists ? 'Verified Active' : 'Default Circular'}
                    </ThemedText>
                    {formattedSize && (
                      <ThemedText style={styles.pdfMetaDot}>•</ThemedText>
                    )}
                    {formattedSize && (
                      <ThemedText style={styles.pdfMetaText}>{formattedSize}</ThemedText>
                    )}
                    <ThemedText style={styles.pdfMetaDot}>•</ThemedText>
                    <ThemedText style={styles.pdfMetaText}>{formattedUploadTime}</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.pdfActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open and download official schedule PDF"
                  onPress={handleOpenPdf}
                  style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.downloadButtonIcon}>📥</ThemedText>
                  <ThemedText style={styles.downloadButtonText}>
                    Open / Download PDF Timetable
                  </ThemedText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh schedules"
                  onPress={loadData}
                  style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
                >
                  <ThemedText style={styles.refreshButtonText}>⟳ Refresh</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Filter Direction Segment */}
            <View style={styles.filterSection}>
              <ThemedText style={styles.sectionLabel}>DIRECTION FILTER</ThemedText>
              <View style={styles.segmentContainer}>
                {(['all', 'outbound', 'return'] as const).map((dir) => {
                  const isActive = selectedDirection === dir;
                  const label =
                    dir === 'all'
                      ? 'All Trips'
                      : dir === 'outbound'
                      ? 'To UIU (Morning)'
                      : 'From UIU (Return)';
                  return (
                    <Pressable
                      key={dir}
                      accessibilityRole="button"
                      onPress={() => setSelectedDirection(dir)}
                      style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                    >
                      <ThemedText
                        style={[
                          styles.segmentTabText,
                          isActive && styles.segmentTabTextActive,
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Route Filter Scroll */}
            {uniqueRoutes.length > 0 && (
              <View style={styles.routeFilterSection}>
                <ThemedText style={styles.sectionLabel}>ROUTES</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routeScroll}>
                  <Pressable
                    onPress={() => setSelectedRoute('all')}
                    style={[
                      styles.routePill,
                      selectedRoute === 'all' && styles.routePillActive,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.routePillText,
                        selectedRoute === 'all' && styles.routePillTextActive,
                      ]}
                    >
                      All Routes ({schedules.length})
                    </ThemedText>
                  </Pressable>
                  {uniqueRoutes.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedRoute(r.id)}
                      style={[
                        styles.routePill,
                        selectedRoute === r.id && styles.routePillActive,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.routePillText,
                          selectedRoute === r.id && styles.routePillTextActive,
                        ]}
                      >
                        {r.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Departures List */}
            <View style={styles.departuresSection}>
              <View style={styles.departuresHeaderRow}>
                <ThemedText style={styles.sectionLabel}>SCHEDULED DEPARTURES</ThemedText>
                <ThemedText style={styles.departuresCount}>
                  {filteredSchedules.length} departures
                </ThemedText>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FF6500" />
                  <ThemedText style={styles.loadingText}>Loading latest timetable...</ThemedText>
                </View>
              ) : filteredSchedules.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyIcon}>🕒</ThemedText>
                  <ThemedText style={styles.emptyTitle}>No scheduled departures found</ThemedText>
                  <ThemedText style={styles.emptySubtitle}>
                    Download the official PDF above to see full circular guidelines.
                  </ThemedText>
                </View>
              ) : (
                filteredSchedules.map((item) => {
                  const isOutbound = item.direction === 'outbound';
                  return (
                    <View key={item.id} style={styles.departureCard}>
                      <View style={styles.timeBadge}>
                        <ThemedText style={styles.timeBadgeText}>
                          {item.departure_time.substring(0, 5)}
                        </ThemedText>
                        <ThemedText style={styles.timeBadgePeriod}>
                          {Number(item.departure_time.substring(0, 2)) >= 12 ? 'PM' : 'AM'}
                        </ThemedText>
                      </View>

                      <View style={styles.departureInfo}>
                        <ThemedText style={styles.departureRouteName}>
                          {item.route_name || 'UIU Dedicated Route'}
                        </ThemedText>
                        <View style={styles.departureMetaRow}>
                          <View
                            style={[
                              styles.directionBadge,
                              isOutbound ? styles.outboundBadge : styles.returnBadge,
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.directionBadgeText,
                                isOutbound ? styles.outboundText : styles.returnText,
                              ]}
                            >
                              {isOutbound ? '↗ To UIU Campus' : '↙ Return City'}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.scheduleDaysText}>
                            Sun – Thu • Regular
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Information Card */}
            <View style={styles.noticeCard}>
              <ThemedText style={styles.noticeTitle}>ℹ️ Transport Advisory</ThemedText>
              <ThemedText style={styles.noticeText}>
                Shuttle buses depart strictly on schedule. Please arrive at the designated pickup points at least 5 minutes before departure. During exam weeks, additional special trips are announced via circular.
              </ThemedText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '92%',
    backgroundColor: '#0F131D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 101, 0, 0.18)',
    marginBottom: 4,
  },
  headerBadgeText: {
    color: '#FF8A45',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  closeButtonText: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '700',
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    gap: 8,
  },
  notificationDot: {
    color: '#10B981',
    fontSize: 10,
  },
  notificationText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  pdfCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(25, 30, 44, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 101, 0, 0.4)',
    padding: Spacing.three,
    marginBottom: Spacing.four,
    shadowColor: '#FF6500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  pdfCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF6500',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pdfMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  pdfMetaBadge: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pdfMetaDot: {
    color: '#6B7280',
    fontSize: 10,
  },
  pdfMetaText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  pdfActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.three,
  },
  downloadButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#FF6500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.two,
  },
  downloadButtonIcon: {
    fontSize: 16,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: Spacing.three,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FF6500',
  },
  segmentTabText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  routeFilterSection: {
    marginBottom: Spacing.three,
  },
  routeScroll: {
    flexDirection: 'row',
  },
  routePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  routePillActive: {
    backgroundColor: 'rgba(255, 101, 0, 0.2)',
    borderColor: '#FF6500',
  },
  routePillText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  routePillTextActive: {
    color: '#FF8A45',
    fontWeight: '700',
  },
  departuresSection: {
    marginBottom: Spacing.four,
  },
  departuresHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  departuresCount: {
    color: '#6B7280',
    fontSize: 11,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: 8,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  departureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 30, 44, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    marginBottom: 8,
  },
  timeBadge: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timeBadgePeriod: {
    color: '#FF8A45',
    fontSize: 10,
    fontWeight: '800',
  },
  departureInfo: {
    flex: 1,
  },
  departureRouteName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  departureMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outboundBadge: {
    backgroundColor: 'rgba(56, 217, 139, 0.15)',
  },
  outboundText: {
    color: '#38D98B',
    fontSize: 10,
    fontWeight: '700',
  },
  returnBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  returnText: {
    color: '#FB923C',
    fontSize: 10,
    fontWeight: '700',
  },
  scheduleDaysText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  directionBadgeText: {},
  noticeCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.three,
  },
  noticeTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.75,
  },
});

