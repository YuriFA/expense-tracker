/**
 * Ambient declaration for NativeWind's global CSS side-effect import
 * (`import '../../global.css'` in `app/_layout.tsx`).
 *
 * NativeWind's generated `nativewind-env.d.ts` triple-slash-references
 * `nativewind/types`, which this 4.2.6 build does not ship as a resolvable
 * subpath (its package.json has no `exports` map and no `types/` entry), so the
 * `*.css` module declaration it is meant to provide never lands. Declaring the
 * module here makes the side-effect import type-check. Behavior at runtime is
 * unchanged - NativeWind's Metro plugin (`withNativeWind`) still processes the
 * stylesheet.
 */
declare module '*.css'
