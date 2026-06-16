import { ExpoRoot } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}
