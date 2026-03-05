import { AlertProvider, useAlert } from '@/src/contexts/AlertContext';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

// Dummy component to consume the context
const TestComponent = () => {
  const { alertData, showAlert, hideAlert } = useAlert();

  return (
    <View>
      <Pressable
        testID="show-alert"
        onPress={() =>
          showAlert('Test Title', 'Test Message', [
            { text: 'Cancel', style: 'cancel', onPress: hideAlert },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                // mock delete action
                hideAlert();
              },
            },
          ])
        }
      >
        <Text>Show Alert</Text>
      </Pressable>

      {/* Mock rendering of external CustomAlert component logic using context data */}
      {alertData && (
        <View testID="active-alert">
          <Text testID="alert-title">{alertData.title}</Text>
          <Text testID="alert-msg">{alertData.message}</Text>
          {alertData.buttons?.map((btn, idx) => (
            <Pressable key={idx} testID={`alert-btn-${btn.text}`} onPress={btn.onPress}>
              <Text>{btn.text}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

describe('AlertContext logic', () => {
  it('shows and hides alert correctly verifying buttons', () => {
    const { getByTestId, queryByTestId } = render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    // Alert should not be visible initially
    expect(queryByTestId('active-alert')).toBeNull();

    // Trigger alert
    fireEvent.press(getByTestId('show-alert'));

    // Alert should be visible with correct data
    expect(getByTestId('active-alert')).toBeTruthy();
    expect(getByTestId('alert-title').props.children).toBe('Test Title');
    expect(getByTestId('alert-msg').props.children).toBe('Test Message');

    // Trigger destructive button (Delete)
    const deleteBtn = getByTestId('alert-btn-Delete');
    fireEvent.press(deleteBtn);

    // Because the button action calls hideAlert(), the alert should disappear
    expect(queryByTestId('active-alert')).toBeNull();
  });
});

