import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/app/HomeScreen';
import TripScreen from '../screens/app/TripScreen';
import ContactsScreen from '../screens/app/ContactsScreen';
import SOSScreen from '../screens/app/SOSScreen';
import HistoryScreen from '../screens/app/HistoryScreen';

const Stack = createStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Trip" component={TripScreen} />
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="SOS" component={SOSScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
