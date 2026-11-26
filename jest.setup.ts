jest.mock('react-native-url-polyfill/auto', () => ({}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Share: { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }) },
  Platform: { OS: 'android' },
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/generated.pdf' }),
  printAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...args: any[]) => ({
    uri: args.join('/'),
    exists: false,
    delete: jest.fn(),
    copy: jest.fn().mockResolvedValue(undefined),
  })),
  Paths: { cache: 'file:///tmp/cache' },
}));
