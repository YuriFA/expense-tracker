module.exports = function (api) {
  api.cache(true)
  return {
    // NativeWind v4:
    //  - `jsxImportSource: 'nativewind'` rewires the JSX runtime so `className`
    //    props are picked up and compiled to native styles.
    //  - `nativewind/babel` adds the type-only `className` prop to host
    //    components (View/Text/...) at build time.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
