import { StyleSheet, Text, View } from 'react-native';

// Temporary placeholder until the home screen is built (Prompt 6).
export default function Index() {
  return (
    <View style={styles.container}>
      {/* TODO(i18n): replaced by translated UI in Prompt 3 */}
      <Text style={styles.title}>TurboTaxi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700' },
});
