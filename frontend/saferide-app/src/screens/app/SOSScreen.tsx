import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SOSScreen() {
  return (
    <View style={styles.container}>
      <Text style={{ color: 'red', fontSize: 24, fontWeight: 'bold' }}>SOS / Emergency Triggered</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
