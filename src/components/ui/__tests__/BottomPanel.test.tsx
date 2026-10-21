import { fireEvent } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { BottomPanel } from '@/components/ui/BottomPanel';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

// gorhom's own mock never renders `footerComponent`; render it the way the real sheet does
// (as a component type), so a new identity per render would show up as a remount.
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      footerComponent: Footer,
    }: {
      children: React.ReactNode;
      footerComponent?: React.ComponentType<object>;
    }) => (
      <View>
        {children}
        {Footer ? <Footer /> : null}
      </View>
    ),
    BottomSheetView: View,
    BottomSheetScrollView: View,
    BottomSheetFooter: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

const mounts = jest.fn();
function FooterProbe({ label }: { label: string }) {
  useEffect(() => mounts(), []);
  return <Text>{label}</Text>;
}

function Harness() {
  const [label, setLabel] = useState('one');
  return (
    <BottomPanel footer={<FooterProbe label={label} />}>
      <Pressable accessibilityRole="button" onPress={() => setLabel('two')}>
        <Text>change</Text>
      </Pressable>
    </BottomPanel>
  );
}

describe('BottomPanel', () => {
  it('keeps the footer mounted across re-renders with a new footer element', async () => {
    const view = await renderWithTheme(<Harness />);
    expect(view.getByText('one')).toBeTruthy();
    await fireEvent.press(view.getByText('change'));
    expect(view.getByText('two')).toBeTruthy();
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});
