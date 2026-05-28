import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Button title="Start Trip" onPress={() => navigation.navigate('Trip')} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Contacts" onPress={() => navigation.navigate('Contacts')} />
      <View style={{ marginVertical: 10 }} />
      <Button title="History" onPress={() => navigation.navigate('History')} />
      <View style={{ marginVertical: 10 }} />
      <Button title="SOS" onPress={() => navigation.navigate('SOS')} color="red" />
    </View>
  );
}
const styles = StyleSheet.create({ 
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 }
});
