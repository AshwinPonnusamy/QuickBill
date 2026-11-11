import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { HERO_COLORS, HERO_RADIUS } from './theme';

export interface ModalProps {
  isOpen?: boolean;
  visible?: boolean;
  onClose?: () => void;
  onDismiss?: () => void;
  children?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  visible,
  onClose,
  onDismiss,
  children,
  contentContainerStyle,
}) => {
  const isVisible = isOpen !== undefined ? isOpen : !!visible;
  const handleClose = onClose || onDismiss;

  return (
    <RNModal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.dialog, contentContainerStyle]}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

export const ModalContent: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.content, style]}>{children}</View>;

export const ModalHeader: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => (
  <View style={[styles.header, style]}>
    {typeof children === 'string' ? (
      <Text style={styles.title}>{children}</Text>
    ) : (
      children
    )}
  </View>
);

export const ModalBody: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.body, style]}>{children}</View>;

export const ModalFooter: React.FC<{ children?: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <View style={[styles.footer, style]}>{children}</View>;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: HERO_COLORS.content1,
    borderRadius: HERO_RADIUS.xl,
    borderWidth: 1,
    borderColor: HERO_COLORS.defaultBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: HERO_COLORS.foreground,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

