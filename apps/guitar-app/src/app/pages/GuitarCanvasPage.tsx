import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import GuitarCanvas from '../components/GuitarCanvas';
import { formatGesture, useGuitarEngine } from '../state/useGuitarEngine';

const GESTURE_LOG_LIMIT = 5;

export const GuitarCanvasPage: React.FC = () => {
  const { handleGesture, headline, gestureLog, gestureDescriptions, status, playDemo, isDemoPlaying } = useGuitarEngine({
    logLimit: GESTURE_LOG_LIMIT,
  });

  const gestureLogView = useMemo(
    () =>
      gestureLog.length === 0 ? (
        <Text style={styles.logEntry}>No interactions captured yet.</Text>
      ) : (
        gestureLog.map((gesture, index) => (
          <Text key={`${gesture.type}-${index}`} style={styles.logEntry}>
            {gestureDescriptions[index] ?? formatGesture(gesture)}
          </Text>
        ))
      ),
    [gestureDescriptions, gestureLog]
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title} testID="page-title">
          Guitar Canvas
        </Text>
        <Text style={styles.subtitle}>
          Explore the virtual fretboard with taps, slides, and vertical strums.
        </Text>
        <View style={styles.actionsRow}>
          <Pressable
            testID="demo-button"
            accessibilityRole="button"
            disabled={isDemoPlaying}
            onPress={playDemo}
            style={({ pressed }) => [
              styles.demoButton,
              pressed && styles.demoButtonPressed,
              isDemoPlaying && styles.demoButtonDisabled,
            ]}
          >
            <Text style={styles.demoButtonLabel} testID="demo-button-label">
              {isDemoPlaying ? 'Playing demo...' : 'Play classical demo'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.canvasContainer}>
          <GuitarCanvas onGesture={handleGesture} />
        </View>
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Live feedback</Text>
          <Text style={styles.feedbackHeadline} testID="gesture-headline">
            {headline}
          </Text>
          <Text style={styles.feedbackMessage}>{status.message}</Text>
          <View style={styles.feedbackMeta}>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Active string</Text>
              <Text style={styles.feedbackValue}>
                {status.activeString?.string.name ?? status.activeString?.string.label ?? '—'}
              </Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Pitch</Text>
              <Text style={styles.feedbackValue}>
                {status.activeString
                  ? `${status.activeString.label} • ${status.activeString.frequency.toFixed(2)} Hz`
                  : '—'}
              </Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Chord</Text>
              <Text style={styles.feedbackValue}>{status.chord ? status.chord.label : '—'}</Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Fret</Text>
              <Text style={styles.feedbackValue}>
                {status.activeString
                  ? status.activeString.fret
                  : status.slide
                    ? status.slide.targetFret
                    : '—'}
              </Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Articulation</Text>
              <Text style={styles.feedbackValue}>
                {status.activeString?.articulation ?? (status.strum ? 'strum' : status.slide ? 'slide' : '—')}
              </Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Strum</Text>
              <Text style={styles.feedbackValue}>
                {status.strum ? `${status.strum.direction} (${status.strum.velocity.toFixed(2)})` : '—'}
              </Text>
            </View>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackLabel}>Slide</Text>
              <Text style={styles.feedbackValue}>
                {status.slide ? `${status.slide.direction} • ${status.slide.distance.toFixed(0)}px` : '—'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.logCard} testID="gesture-log">
          <Text style={styles.logTitle}>Recent gestures</Text>
          {gestureLogView}
        </View>
      </ScrollView>
    </View>
  );
}; 

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  canvasContainer: {
    height: 320,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  actionsRow: {
    marginBottom: 24,
  },
  demoButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  demoButtonPressed: {
    opacity: 0.85,
  },
  demoButtonDisabled: {
    opacity: 0.6,
  },
  demoButtonLabel: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  feedbackCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  feedbackTitle: {
    color: '#cbd5f5',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  feedbackHeadline: {
    color: '#e2e8f0',
    fontSize: 18,
  },
  feedbackMessage: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  feedbackMeta: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1d283a',
    paddingTop: 12,
    gap: 8,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feedbackLabel: {
    color: '#64748b',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  feedbackValue: {
    color: '#e2e8f0',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  logCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
  },
  logTitle: {
    color: '#cbd5f5',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  logEntry: {
    color: '#e2e8f0',
    fontSize: 15,
    marginBottom: 6,
  },
});

export default GuitarCanvasPage;
