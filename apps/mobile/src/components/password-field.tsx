import { useState, type ComponentProps } from 'react';

import { IconButton } from '@/components/icon-button';
import { TextField } from '@/components/text-field';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'secureTextEntry' | 'trailing'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <IconButton
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          variant="plain"
          accessibilityLabel={visible ? 'Dölj lösenordet' : 'Visa lösenordet'}
          onPress={() => setVisible((value) => !value)}
        />
      }
    />
  );
}
