import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { SectionLabel } from '@/components/section-label';
import { Fonts, Spacing } from '@/constants/theme';
import {
  FRIEND_CODE_LENGTH,
  formatFriendCode,
  normalizeFriendCode,
} from '@/features/friends/friend-code';

export function CodeEntry() {
  const [code, setCode] = useState('');
  const complete = code.length === FRIEND_CODE_LENGTH;

  function submit() {
    if (!complete) return;
    setCode('');
    router.push(`/add/${code}?via=typed`);
  }

  return (
    <View style={styles.section}>
      <SectionLabel>Har du en kod?</SectionLabel>
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField
            value={formatFriendCode(code)}
            onChangeText={(text) => setCode(normalizeFriendCode(text))}
            onSubmitEditing={submit}
            placeholder="K7P-2QX"
            accessibilityLabel="Kompiskod, sex tecken"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            maxLength={FRIEND_CODE_LENGTH + 1}
            style={styles.input}
          />
        </View>
        <Button label="Lägg till" disabled={!complete} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  field: { flex: 1 },
  input: { fontFamily: Fonts.mono, letterSpacing: 2 },
});
