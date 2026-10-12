import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { CarForm } from '@/features/profile/components/car-form';
import { useCar } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const { data: car, isLoading, isError, refetch } = useCar(id);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton width="100%" height={240} radius={Radius.lg} />
        <Skeleton width="100%" height={48} radius={Radius.md} />
        <Skeleton width="100%" height={48} radius={Radius.md} />
      </View>
    );
  }
  if (isError) {
    return (
      <ErrorState
        message="EPA:n gick inte att ladda. Kolla nätet och testa igen."
        onRetry={refetch}
      />
    );
  }
  if (!car || car.owner_id !== userId) {
    return (
      <EmptyState
        icon="car-sport-outline"
        title="EPA:n finns inte"
        message="Den kan ha tagits bort, eller så är den inte din."
      />
    );
  }
  return <CarForm car={car} />;
}

const styles = StyleSheet.create({
  loading: { padding: Spacing.three, gap: Spacing.three },
});
