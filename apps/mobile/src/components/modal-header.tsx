import type { ReactNode } from 'react';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { HeaderBar } from '@/components/header-bar';
import { IconButton } from '@/components/icon-button';
import { Common } from '@/constants/strings';

type ModalHeaderAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type ModalHeaderProps = {
  title: string;
  leading?: 'cancel' | 'close';
  onClose?: () => void;
  action?: ModalHeaderAction;
  trailing?: ReactNode;
  titleVisible?: boolean;
};

export function ModalHeader({
  title,
  leading = 'cancel',
  onClose,
  action,
  trailing,
  titleVisible,
}: ModalHeaderProps) {
  const close = onClose ?? (() => router.back());
  return (
    <HeaderBar
      title={title}
      titleVisible={titleVisible}
      left={
        leading === 'close' ? (
          <IconButton icon="close" accessibilityLabel={Common.close} onPress={close} />
        ) : (
          <Button label={Common.cancel} variant="ghost" size="sm" onPress={close} />
        )
      }
      right={
        action ? (
          <Button
            label={action.label}
            size="sm"
            loading={action.loading}
            disabled={action.disabled}
            onPress={action.onPress}
          />
        ) : (
          trailing
        )
      }
    />
  );
}
