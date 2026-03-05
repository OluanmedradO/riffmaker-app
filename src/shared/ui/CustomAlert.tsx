import { useAlert } from '@/src/contexts/AlertContext';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '@/src/shared/theme/ThemeProvider';

export const CustomAlert = () => {
  const { alertData, hideAlert } = useAlert();
  const theme = useTheme();

  // If there's no alertData, we keep the component tree mounted but hidden
  if (!alertData) return null;

  const handlePressBackground = () => {
    if (alertData.cancelable) {
      hideAlert();
    }
  };

  const handleButtonPress = (onPress?: () => void) => {
    hideAlert();
    if (onPress) {
      // Small timeout allows alert close animation to start before heavy lifting
      setTimeout(() => onPress(), 50);
    }
  };

  return (
    <View style={styles.overlayContainer}>
      <Reanimated.View 
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handlePressBackground} />
      </Reanimated.View>
      
      <Reanimated.View
        entering={SlideInUp.duration(250)}
        exiting={SlideOutDown.duration(200).withInitialValues({ transform: [{ translateY: 0 }]})}
        style={[styles.alertBox, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={[styles.title, { color: theme.foreground }]}>{alertData.title}</Text>
        
        {!!alertData.message && (
          <Text style={[styles.message, { color: theme.mutedForeground }]}>
            {alertData.message}
          </Text>
        )}

        {/* Buttons layout varies slightly depending on amount of buttons */}
        <View style={[
          styles.buttonsContainer, 
          alertData.buttons && alertData.buttons.length > 2 ? { flexDirection: 'column' } : { flexDirection: 'row' }
        ]}>
          {alertData.buttons?.map((btn, index) => {
            const isDestructive = btn.style === 'destructive';
            const isCancel = btn.style === 'cancel';
            
            return (
              <Pressable
                key={index}
                onPress={() => handleButtonPress(btn.onPress)}
                style={({ pressed }) => [
                  styles.button,
                  {
                    flex: alertData.buttons && alertData.buttons.length <= 2 ? 1 : undefined,
                    backgroundColor: isDestructive ? theme.destructive : (isCancel ? theme.secondary : theme.primary),
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
              >
                <Text style={[
                  styles.buttonText, 
                  { color: isDestructive ? theme.destructiveForeground : (isCancel ? theme.secondaryForeground : theme.primaryForeground) }
                ]}>
                  {btn.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Reanimated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999, // Ensure it's on top of everything including modals
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  }
});

