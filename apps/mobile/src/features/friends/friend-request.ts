export function friendRequestToast(status: string, name: string) {
  return status === 'accepted'
    ? `Du och ${name} är kompisar nu!`
    : `Förfrågan skickad till ${name}!`;
}

export function friendRequestPermissionReason(status: string) {
  return status === 'accepted' ? 'friend_accepted' : 'friend_request';
}
