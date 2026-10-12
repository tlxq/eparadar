import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import type { ImageSource } from '@/lib/pick-image';

type PhotoSourceSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onPick: (source: ImageSource) => void;
  onRemove?: () => void;
};

export function PhotoSourceSheet({
  visible,
  title,
  onClose,
  onPick,
  onRemove,
}: PhotoSourceSheetProps) {
  const actions: SheetAction[] = [
    { label: 'Ta bild', icon: 'camera-outline', onPress: () => onPick('camera') },
    { label: 'Välj från bilder', icon: 'image-outline', onPress: () => onPick('library') },
  ];
  if (onRemove) {
    actions.push({
      label: 'Ta bort bild',
      icon: 'trash-outline',
      destructive: true,
      onPress: onRemove,
    });
  }
  return <ActionSheet visible={visible} title={title} onClose={onClose} actions={actions} />;
}
