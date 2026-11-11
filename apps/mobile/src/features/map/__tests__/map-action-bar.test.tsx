import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import { MapActionBar } from '@/features/map/components/map-action-bar';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderBar(ghost: boolean, ghostBusy = false) {
  const onToggleGhost = jest.fn();
  const view = await render(
    <MapActionBar
      bottom={0}
      ghost={ghost}
      ghostBusy={ghostBusy}
      onToggleGhost={onToggleGhost}
      onAddRagga={jest.fn()}
      onAddWarning={jest.fn()}
      onAddMeet={jest.fn()}
      onLocate={jest.fn()}
      following={false}
      locating={false}
    />,
  );
  const ghostSwitch = () => view.getByLabelText(/^Spökläge/);
  return { ghostSwitch, onToggleGhost };
}

describe('MapActionBar ghost switch', () => {
  it('switches ghost mode with one tap', async () => {
    const { ghostSwitch, onToggleGhost } = await renderBar(false);
    const toggle = ghostSwitch();
    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(toggle);
    expect(onToggleGhost).toHaveBeenCalledTimes(1);
  });

  it('shows that ghost mode is on', async () => {
    const { ghostSwitch } = await renderBar(true);
    expect(ghostSwitch().props.accessibilityState).toMatchObject({ checked: true });
    expect(ghostSwitch().props.accessibilityLabel).toBe('Spökläge är på. Kompisarna ser dig inte');
  });

  it('ignores taps while the change is saving', async () => {
    const { ghostSwitch, onToggleGhost } = await renderBar(false, true);
    await fireEvent.press(ghostSwitch());
    expect(onToggleGhost).not.toHaveBeenCalled();
  });
});
