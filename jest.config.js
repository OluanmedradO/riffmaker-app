module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/storage/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|@react-navigation/.*|react-native-reanimated|react-native-svg|phosphor-react-native))",
  ],
  clearMocks: true,
};
