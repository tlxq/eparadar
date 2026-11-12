import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { FRIEND_CODE_LENGTH, normalizeFriendCode } from '@/features/friends/friend-code';
import { useTheme } from '@/hooks/use-theme';

const BOX_INDEXES = Array.from({ length: FRIEND_CODE_LENGTH }, (_, index) => index);

export default function EnterFriendCodeScreen() {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const complete = code.length === FRIEND_CODE_LENGTH;

  function submit() {
    if (complete) router.replace(`/add/${code}?via=typed`);
  }

  return (
    <FormScreen
      title="Skriv kod"
      footer={<Button label="Lägg till" disabled={!complete} onPress={submit} />}
    >
      <ThemedText themeColor="textSecondary" style={styles.center}>
        Koden står under kompisens QR, till exempel K7P-2QX.
      </ThemedText>
      <Pressable
        accessibilityRole="none"
        onPress={() => inputRef.current?.focus()}
        style={styles.boxes}
      >
        {BOX_INDEXES.map((index) => {
          const char = code[index] ?? '';
          const active = focused && index === Math.min(code.length, FRIEND_CODE_LENGTH - 1);
          return (
            <View key={index} style={styles.boxGroup}>
              {index === 3 ? (
                <ThemedText type="headline" themeColor="textSecondary">
                  –
                </ThemedText>
              ) : null}
              <View
                style={[
                  styles.box,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <ThemedText type="codeDigit">{char}</ThemedText>
              </View>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(text) => setCode(normalizeFriendCode(text))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={submit}
        autoFocus
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="default"
        returnKeyType="done"
        maxLength={FRIEND_CODE_LENGTH + 1}
        accessibilityLabel="Kompiskod, sex tecken"
        style={styles.hiddenInput}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  boxGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: {
    width: 44,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
