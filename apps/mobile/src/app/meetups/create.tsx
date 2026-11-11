import { router, useLocalSearchParams } from 'expo-router';

import { Words } from '@/constants/strings';
import { useCreateMeetup } from '@/features/meetups/hooks';
import { MeetupForm } from '@/features/meetups/meetup-form';
import { useUserId } from '@/hooks/use-user-id';

export default function CreateMeetupScreen() {
  const userId = useUserId();
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const createMeetup = useCreateMeetup();

  return (
    <MeetupForm
      heading="Ny träff"
      submitLabel={Words.place}
      submitIcon="location"
      pending={createMeetup.isPending}
      onSubmit={(values) => {
        if (!userId || !lat || !lng) return;
        createMeetup.mutate(
          {
            creatorId: userId,
            title: values.title,
            vibe: values.vibe,
            description: values.description,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            startsAt: values.startsAt.toISOString(),
          },
          { onSuccess: () => router.back() },
        );
      }}
    />
  );
}
