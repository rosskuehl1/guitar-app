import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import GuitarCanvasPage from './pages/GuitarCanvasPage';

export const App = () => {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <GuitarCanvasPage />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
});

export default App;
