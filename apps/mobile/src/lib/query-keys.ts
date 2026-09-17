export const queryKeys = {
  friends: (userId: string | undefined) => ['friends', userId] as const,
  friendRequests: (userId: string | undefined) => ['friendRequests', userId] as const,
  outgoingRequests: (userId: string | undefined) => ['outgoingRequests', userId] as const,
  meetups: () => ['meetups'] as const,
  meetupDetail: (meetupId: string | undefined) => ['meetupDetail', meetupId] as const,
};
