import { RiffCard } from '@/src/features/riff/components/RiffCard';
import { ThemeProvider } from '@/src/shared/theme/ThemeProvider';
import { Riff } from '@/src/domain/types/riff';
import { render } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

// Simple mock for external dependencies embedded in RiffCard
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));
jest.mock('@/src/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/src/utils/AudioManager', () => ({
  PreviewPlayerManager: { subscribe: jest.fn(), toggle: jest.fn(), stop: jest.fn() }
}));
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});


describe('RiffCard Performance Smoke Test', () => {
  it('renders 300 cards without crashing', () => {
    
    // Generate 300 mock riffs
    const mockRiffs: Riff[] = Array.from({ length: 300 }).map((_, i) => ({
      id: `riff-${i}`,
      name: `Smoke Riff ${i}`,
      createdAt: Date.now() - (i * 1000),
      duration: 1500 + i,
      audioUri: 'file://mock', // required to render play buttons
      favorite: i % 5 === 0,
      projectId: i % 2 === 0 ? 'project-1' : null,
      type: 'Guitar',
      energyLevel: 'medium',
      waveform: []
    }));

    // Suppress console logs during this massive render if react complains about lists
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Render tree
    const { getAllByTestId } = render(
      <ThemeProvider>
        <ScrollView>
          {mockRiffs.map(r => (
            <RiffCard 
              key={r.id} 
              riff={r} 
              onDelete={jest.fn()} 
              onPress={jest.fn()} 
            />
          ))}
        </ScrollView>
      </ThemeProvider>
    );

    // Verify all 300 cards rendered their view (through the play button existence)
    const playButtons = getAllByTestId(/play-button-riff-/);
    expect(playButtons.length).toBe(300);

    consoleSpy.mockRestore();
  });
});


