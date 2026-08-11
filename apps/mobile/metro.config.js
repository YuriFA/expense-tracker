const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// NativeWind v4: inline the compiled global.css into the bundle, and pin the
// inlined `rem` to 16px so Tailwind's rem-based spacing/typography maps to the
// same pixels as the web design system.
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 })
