# Contributing to Riff Maker 🎸

First off, thank you for considering contributing to Riff Maker! It's people like you that make this app better for musicians everywhere.

## Code of Conduct

This project and everyone participating in it is expected to:
- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When filing a bug report, include:
- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Device/OS info** (e.g., "iPhone 12, iOS 16.1" or "Pixel 7, Android 13")
- **App version** (found in Settings)

**Example:**
```
Title: Audio recording fails on Android 12

Description:
When attempting to record a riff on Android 12, the recording
button becomes unresponsive after granting microphone permission.

Steps to reproduce:
1. Open the app for the first time
2. Grant microphone permission
3. Try to record audio
4. Button becomes gray and unresponsive

Expected: Recording should start
Actual: Nothing happens

Device: Samsung Galaxy S21, Android 12
App Version: 1.0.0
```

### ✨ Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear title** describing the enhancement
- **Provide a detailed description** of the suggested enhancement
- **Explain why this would be useful** to most Riff Maker users
- **List examples** of how it works in other apps (if applicable)

### 🔧 Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following our coding style
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Write a clear commit message**

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/riffmaker-app.git
cd riffmaker-app

# Install dependencies
npm install

# Start development server
npm start

# Run on device/emulator
npm run android  # or npm run ios
```

#### Coding Guidelines

**TypeScript**
- Use strict TypeScript typing (no `any` unless absolutely necessary)
- Define interfaces for component props
- Use type inference where obvious

**React/React Native**
- Use functional components with hooks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Use `React.memo()` for frequently re-rendered components

**File Organization**
```
src/
├── components/     # Shared UI components
├── constants/      # App-wide constants
├── hooks/          # Custom React hooks
├── storage/        # Data persistence layer
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

**Naming Conventions**
- **Components**: PascalCase (e.g., `RiffCard.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useHaptic.ts`)
- **Utils**: camelCase (e.g., `formatters.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RECORDING_SECONDS`)

**Code Style**
```typescript
// ✅ Good
export function RiffCard({ riff, onPress }: RiffCardProps) {
  const theme = useTheme();
  
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={{ color: theme.primary }}>{riff.title}</Text>
    </Pressable>
  );
}

// ❌ Avoid
export function RiffCard(props: any) {
  return <Pressable onPress={props.onPress}>
    <Text>{props.riff.title}</Text>
  </Pressable>
}
```

**Testing Your Changes**
- Test on both iOS and Android if possible
- Test dark mode and light mode
- Test with no data (first run)
- Test with many riffs (performance)
- Test error scenarios (denied permissions, etc.)

#### Commit Messages

Follow conventional commits format:

```
feat: add metronome feature
fix: resolve audio playback crash on Android
docs: update README with new screenshots
style: format code with Prettier
refactor: extract audio logic into custom hook
perf: optimize riff list rendering
test: add tests for formatDate utility
```

#### Before Submitting PR

- [ ] Code follows the style guidelines
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Code is formatted (`npm run format`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Tested on device/emulator
- [ ] Updated documentation if needed
- [ ] Added/updated tests if applicable

### 📚 Documentation

Improvements to documentation are always welcome! This includes:
- README.md
- Code comments
- PRIVACY_POLICY.md
- This CONTRIBUTING.md

### 🎨 Design Contributions

Have ideas for UI/UX improvements?
- Create mockups or wireframes
- Share design inspiration
- Suggest color schemes or themes

Open an issue with the `design` label.

## Project Roadmap

Check [CHANGELOG.md](./CHANGELOG.md) for planned features and current version status.

### Priority Features (v1.1.0)
- Export/Import backup
- Share riffs functionality
- Undo delete

### Future Ideas (v2.0.0+)
- Cloud sync (optional)
- Collaboration features
- Multi-instrument support

## Questions?

Don't hesitate to ask questions! Open an issue with the `question` label.

## Recognition

Contributors will be recognized in:
- CHANGELOG.md for significant features
- Special thanks in release notes
- GitHub contributors page

---

**Thank you for making Riff Maker better! 🎵**
