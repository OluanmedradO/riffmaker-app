import { RiffCard } from '@/src/features/riff/components/RiffCard';
import { ThemeProvider } from '@/src/shared/theme/ThemeProvider';
import { PreviewPlayerManager } from '@/src/utils/AudioManager';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/src/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/src/utils/AudioManager', () => ({
  PreviewPlayerManager: {
    toggle: jest.fn(),
    stop: jest.fn(),
    subscribe: jest.fn(() => jest.fn()), 
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

const mockRiff = {
  id: '1',
  name: 'Test Riff',
  audioUri: 'file://test.m4a',
  createdAt: Date.now(),
  duration: 5000,
  favorite: false,
  waveform: [],
};

const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('RiffCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = renderWithTheme(
      <RiffCard riff={mockRiff} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    expect(getByText('Test Riff')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPressMock = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <RiffCard riff={mockRiff} onPress={onPressMock} onDelete={jest.fn()} />
    );
    
    // Tap the card itself
    fireEvent.press(getByLabelText('Abrir Test Riff'));
    expect(onPressMock).toHaveBeenCalledWith('1');
  });

  it('toggles preview player when play button is pressed', () => {
    const { getByTestId } = renderWithTheme(
      <RiffCard riff={mockRiff} onPress={jest.fn()} onDelete={jest.fn()} />
    );
    
    // Test that the play button triggers the toggle action
    fireEvent.press(getByTestId('play-button-1'));
    expect(PreviewPlayerManager.toggle).toHaveBeenCalledWith('file://test.m4a', { loop: true });
  });
});



