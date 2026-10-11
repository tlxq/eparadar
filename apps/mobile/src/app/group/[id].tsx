import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ConversationAvatar } from '@/components/conversation-avatar';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ListRow } from '@/components/list-row';
import { ScreenBackground } from '@/components/screen-background';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useTheme } from '@/hooks/use-theme';
import {
  conversationTitle,
  leaveConversation,
  removeMember,
  renameConversation,
  setGroupAvatar,
  type ConversationMember,
} from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useConversation } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';
import { ModalHeader } from '@/components/modal-header';
import { Common } from '@/constants/strings';

function byRoleThenName(a: ConversationMember, b: ConversationMember) {
  if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
  return a.profiles.display_name.localeCompare(b.profiles.display_name, 'sv-SE');
}

export default function GroupInfoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [photoSheet, setPhotoSheet] = useState(false);

  const { data: conversation, isError } = useConversation(id);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
  }

  useRealtimeTable({
    channelName: `group-members:${id}`,
    table: 'conversation_members',
    event: '*',
    enabled: !!id,
    onChange: refresh,
  });

  const members = [...(conversation?.conversation_members ?? [])].sort(byRoleThenName);
  const amAdmin = members.some((member) => member.user_id === userId && member.role === 'admin');
  const title = conversation && userId ? conversationTitle(conversation, userId) : '';

  async function saveName() {
    if (!id) return;
    setNameError(null);
    setBusy('rename');
    try {
      await renameConversation(id, name);
      setEditing(false);
      refresh();
    } catch (error) {
      setNameError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function changePhoto(uri: string | null) {
    if (!id) return;
    setBusy('photo');
    try {
      await setGroupAvatar(id, uri);
      refresh();
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function pickPhoto() {
    const uri = await pickImage({ aspect: [1, 1] });
    if (!uri) return;
    await changePhoto(uri);
  }

  async function removePhoto() {
    const ok = await confirmDestructive({
      title: 'Ta bort gruppbilden?',
      message: 'Gruppen visas med sin första bokstav igen.',
      confirmLabel: Common.remove,
    });
    if (ok) await changePhoto(null);
  }

  const photoActions: SheetAction[] = [
    {
      label: conversation?.avatar_path ? 'Välj ny bild' : 'Välj bild',
      icon: 'image-outline',
      onPress: pickPhoto,
    },
    ...(conversation?.avatar_path
      ? [
          {
            label: 'Ta bort bild',
            icon: 'trash-outline' as const,
            destructive: true,
            onPress: removePhoto,
          },
        ]
      : []),
  ];

  async function handleRemove(member: ConversationMember) {
    if (!id) return;
    const ok = await confirmDestructive({
      title: `Ta bort ${member.profiles.display_name}?`,
      message: `${member.profiles.display_name} kan inte längre läsa eller skriva i gruppen.`,
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    setBusy(member.user_id);
    try {
      await removeMember(id, member.user_id);
      refresh();
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function handleLeave() {
    if (!id) return;
    const ok = await confirmDestructive({
      title: 'Lämna gruppen?',
      message:
        'Du slutar få meddelanden från gruppen. För att vara med igen behöver någon starta en ny grupp med dig.',
      confirmLabel: 'Lämna',
    });
    if (!ok) return;
    setBusy('leave');
    try {
      await leaveConversation(id);
      queryClient.removeQueries({ queryKey: queryKeys.conversation(id) });
      queryClient.removeQueries({ queryKey: queryKeys.messages(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      showToast({ message: `Du har lämnat ${title}.` });
      router.dismissTo('/chat');
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      setBusy(null);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ModalHeader title="Gruppinfo" variant="back" />

        <KeyboardAvoider style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {isError ? (
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Du är inte längre med i den här gruppen.
              </ThemedText>
            ) : !conversation ? (
              <View style={styles.hero}>
                <Skeleton width={88} height={88} radius={44} />
                <Skeleton width={160} height={22} />
              </View>
            ) : (
              <>
                <View style={styles.hero}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Byt gruppbild"
                    onPress={() => setPhotoSheet(true)}
                    disabled={busy === 'photo'}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <ConversationAvatar conversation={conversation} myUserId={userId!} size={88} />
                    <View
                      style={[
                        styles.photoBadge,
                        { backgroundColor: theme.brand, borderColor: theme.background },
                      ]}
                    >
                      {busy === 'photo' ? (
                        <ActivityIndicator size="small" color={theme.brandText} />
                      ) : (
                        <Ionicons name="camera" size={14} color={theme.brandText} />
                      )}
                    </View>
                  </Pressable>
                  <ThemedText type="subtitle" style={styles.center}>
                    {title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {members.length} medlemmar
                  </ThemedText>
                </View>

                {editing ? (
                  <View style={styles.editRow}>
                    <TextField
                      label="Gruppnamn"
                      value={name}
                      onChangeText={setName}
                      maxLength={40}
                      autoFocus
                      error={nameError}
                      onSubmitEditing={saveName}
                    />
                    <View style={styles.editActions}>
                      <View style={styles.flex}>
                        <Button
                          label={Common.cancel}
                          variant="secondary"
                          onPress={() => {
                            setEditing(false);
                            setNameError(null);
                          }}
                        />
                      </View>
                      <View style={styles.flex}>
                        <Button
                          label={Common.save}
                          loading={busy === 'rename'}
                          onPress={saveName}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.flex}>
                      <ThemedText type="caption" themeColor="textSecondary">
                        Gruppnamn
                      </ThemedText>
                      <ThemedText type="headline">{title}</ThemedText>
                    </View>
                    <Button
                      label="Ändra"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        setName(conversation.name ?? '');
                        setEditing(true);
                      }}
                    />
                  </View>
                )}

                <View style={styles.members}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
                    MEDLEMMAR
                  </ThemedText>
                  {members.map((member) => {
                    const isMe = member.user_id === userId;
                    return (
                      <ListRow
                        key={member.user_id}
                        title={
                          isMe
                            ? `${member.profiles.display_name} (du)`
                            : member.profiles.display_name
                        }
                        subtitle={`@${member.profiles.username}`}
                        leading={
                          <Avatar
                            name={member.profiles.display_name}
                            imageUrl={member.profiles.avatar_url}
                            size={44}
                          />
                        }
                        trailing={
                          member.role === 'admin' ? (
                            <View style={[styles.badge, { backgroundColor: `${theme.brand}2E` }]}>
                              <ThemedText type="caption" themeColor="brandOnSurface">
                                Admin
                              </ThemedText>
                            </View>
                          ) : amAdmin && !isMe ? (
                            <Button
                              label={Common.remove}
                              size="sm"
                              variant="ghost"
                              tone="danger"
                              loading={busy === member.user_id}
                              onPress={() => handleRemove(member)}
                            />
                          ) : null
                        }
                      />
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoider>

        {conversation ? (
          <View style={styles.footer}>
            <Button
              label="Lämna gruppen"
              icon="exit-outline"
              variant="secondary"
              tone="danger"
              loading={busy === 'leave'}
              onPress={handleLeave}
            />
          </View>
        ) : null}
        <ActionSheet
          visible={photoSheet}
          title="Gruppbild"
          onClose={() => setPhotoSheet(false)}
          actions={photoActions}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four },
  hero: { alignItems: 'center', gap: Spacing.two },
  pressed: { opacity: 0.7 },
  photoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  editRow: { gap: Spacing.three },
  editActions: { flexDirection: 'row', gap: Spacing.two },
  members: { marginHorizontal: -Spacing.three },
  sectionLabel: {
    letterSpacing: 0.6,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
