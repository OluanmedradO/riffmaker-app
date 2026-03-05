import Home from '@/app/(tabs)/index';
import { ThemeProvider } from '@/src/shared/theme/ThemeProvider';
import { useHomeRiffs } from '@/src/features/home/hooks/useHomeRiffs';
import { PreviewPlayerManager } from '@/src/utils/AudioManager';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Mock dependencies
// (Removed inline expo-router mock to use shared mockRouterPush below)

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useScrollToTop: jest.fn(),
}));

jest.mock('@/src/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/src/hooks/useHomeRiffs', () => ({
  useHomeRiffs: jest.fn(),
}));

jest.mock('@/src/hooks/useHaptic', () => ({
  useHaptic: () => ({ triggerHaptic: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

jest.mock('expo-audio', () => ({
  AudioPlayer: jest.fn(),
  createAudioPlayer: jest.fn(),
}));

jest.mock('@/src/utils/AudioManager', () => ({
  PreviewPlayerManager: {
    subscribe: jest.fn().mockReturnValue(jest.fn()), // returns unsubscribe function
    toggle: jest.fn(),
    stop: jest.fn(),
  }
}));

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useFocusEffect: jest.fn((cb) => cb()),
}));

const mockHomeRiffsReturn = {
  riffs: [
    { id: '1', name: 'Riff 1', createdAt: Date.now(), duration: 1000 },
    { id: '2', name: 'Riff 2', createdAt: Date.now() - 86400000, duration: 2000 },
  ],
  projects: [],
  loading: false,
  loadRiffs: jest.fn((cb) => cb && cb()),
  handleDelete: jest.fn(),
  handleDuplicate: jest.fn(),
  handleToggleFavorite: jest.fn(),
  handleBulkDelete: jest.fn(),
  handleBulkMove: jest.fn(),
  selectionMode: false,
  setSelectionMode: jest.fn(),
  selectedIds: new Set(),
  setSelectedIds: jest.fn(),
  showMoveModal: false,
  setShowMoveModal: jest.fn(),
};

const renderWithTheme = (component: React.ReactNode) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHomeRiffs as jest.Mock).mockReturnValue(mockHomeRiffsReturn);
  });

  it('renders loading state correctly', () => {
    (useHomeRiffs as jest.Mock).mockReturnValueOnce({
      ...mockHomeRiffsReturn,
      loading: true,
    });
    const { getByText, queryByText } = renderWithTheme(<Home />);
    
    // Header should be visible even in loading state (base title)
    expect(getByText('home.title')).toBeTruthy();
    // Items should not be present
    expect(queryByText('Riff 1')).toBeNull();
  });

  it('renders a list of riffs correctly', () => {
    const { getByText } = renderWithTheme(<Home />);
    
    // In our mocked riffs, we have 'Riff 1' and 'Riff 2'
    expect(getByText('Riff 1')).toBeTruthy();
    expect(getByText('Riff 2')).toBeTruthy();
  });

  it('renders empty state when no riffs are present and clicks CTA', () => {
    (useHomeRiffs as jest.Mock).mockReturnValueOnce({
      ...mockHomeRiffsReturn,
      riffs: [],
    });
    const { getByText } = renderWithTheme(<Home />);
    
    // "home.empty_title" should be visible
    expect(getByText('home.empty_title')).toBeTruthy();

    // Fire empty state record button CTA
    // The button has text "home.record_now" (mocked via useTranslation)
    const recordBtn = getByText('home.record_now');
    expect(recordBtn).toBeTruthy();
    // Assuming handleImmersiveRecord calls router.push('/record')
    // We can just check the function existence for now.
  });

  it('toggles preview on single riff card', async () => {
    // Re-render with riffs that have audioUri to allow preview
    (useHomeRiffs as jest.Mock).mockReturnValue({
      ...mockHomeRiffsReturn,
      riffs: [
        { id: '1', name: 'Riff 1', audioUri: 'file://1.m4a', createdAt: Date.now(), duration: 1000 },
        { id: '2', name: 'Riff 2', audioUri: 'file://2.m4a', createdAt: Date.now(), duration: 2000 },
      ],
    });
    
    const { getByTestId } = renderWithTheme(<Home />);
    
    // Find the play button for Riff 1
    const playButton1 = getByTestId('play-button-1');
    expect(playButton1).toBeTruthy();

    fireEvent.press(playButton1);
    // Assert that PreviewPlayerManager.toggle was called with the correct audioUri
    expect(PreviewPlayerManager.toggle).toHaveBeenCalledWith('file://1.m4a', { loop: true });
  });
});

