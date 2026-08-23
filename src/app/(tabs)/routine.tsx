import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { describeTreatment } from '@/features/treatment/describe';
import {
  getActiveTreatmentPeriod,
  getDrugsForPeriod,
  pauseTreatmentPeriod,
  resumeTreatmentPeriod,
} from '@/features/treatment/api';

export default function RoutineScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['routine'],
    queryFn: async () => {
      const period = await getActiveTreatmentPeriod();
      const drugs = period ? await getDrugsForPeriod(period.id) : [];
      return { period, drugs };
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['routine'] });
    queryClient.invalidateQueries({ queryKey: ['doses'] });
    queryClient.invalidateQueries({ queryKey: ['streak'] });
    queryClient.invalidateQueries({ queryKey: ['consistency'] });
  };

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          title: 'Routine',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'checklist', android: 'checklist', web: 'checklist' }}
              size={22}
              tintColor={color}
            />
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Routine</ThemedText>

        {!isLoading && data?.period ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{describeTreatment(data.period.planType, data.drugs)}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Since {data.period.startDate}
            </ThemedText>

            <Pressable
              onPress={async () => {
                if (data.period!.status === 'paused') {
                  await resumeTreatmentPeriod(data.period!.id);
                } else {
                  await pauseTreatmentPeriod(data.period!.id, null);
                }
                invalidate();
              }}>
              <ThemedText type="linkPrimary">
                {data.period.status === 'paused' ? 'Resume' : 'Pause treatment'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        <Link href="/treatment/start-new" asChild>
          <Pressable>
            <ThemedText type="linkPrimary">Start new treatment</ThemedText>
          </Pressable>
        </Link>

        <Link href="/timeline" asChild>
          <Pressable>
            <ThemedText type="linkPrimary">View timeline</ThemedText>
          </Pressable>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
});
