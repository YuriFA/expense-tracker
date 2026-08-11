/**
 * Legacy re-export of the centered day carousel.
 *
 * The implementation now lives in `./DayCarousel` (`<DayCarousel/>`,
 * react-native-reanimated-carousel) with the presentational chip in
 * `./DayItem`. This file keeps the historical `DateCarousel` name + import
 * path compiling; new callers should import `DayCarousel` directly. Safe to
 * delete once no consumer references the `DateCarousel` name.
 */
export { DayCarousel as DateCarousel } from './DayCarousel'
