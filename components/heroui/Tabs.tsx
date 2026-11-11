import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { HERO_COLORS, HERO_RADIUS, HeroRadius } from './theme';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items?: TabItem[];
  selectedKey?: string;
  onSelectionChange?: (key: string) => void;
  radius?: HeroRadius;
  variant?: 'solid' | 'bordered' | 'light' | 'underlined';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  selectedKey,
  onSelectionChange,
  radius = 'lg',
  variant = 'solid',
  style,
  children,
}) => {
  const borderRadius = HERO_RADIUS[radius];

  if (!items) {
    return (
      <View style={[styles.container, { borderRadius }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContainer, style]}
    >
      <View style={[styles.tabBar, { borderRadius }]}>
        {items.map((tab) => {
          const isSelected = selectedKey === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              onPress={() => onSelectionChange && onSelectionChange(tab.id)}
              style={[
                styles.tabItem,
                { borderRadius: borderRadius > 4 ? borderRadius - 4 : borderRadius },
                isSelected && styles.activeTabItem,
              ]}
            >
              {tab.icon ? <View style={styles.icon}>{tab.icon}</View> : null}
              <Text style={[styles.tabText, isSelected && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

export const Tab: React.FC<{
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ children }) => {
  return <View style={styles.tabContent}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: HERO_COLORS.defaultLight,
    padding: 4,
  },
  scrollContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: HERO_COLORS.defaultLight,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeTabItem: {
    backgroundColor: HERO_COLORS.content1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: HERO_COLORS.foregroundMuted,
  },
  activeTabText: {
    color: HERO_COLORS.foreground,
    fontWeight: '800',
  },
  tabContent: {
    flex: 1,
  },
});

