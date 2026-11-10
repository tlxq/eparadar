# epaRadar icon

The rear of a boxy 80s sedan with the orange slow-vehicle triangle on the bumper. Drawn by hand as
SVG on a 64 × 64 grid; no brand details from any real car.

| File           | What                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `icon-car.svg` | The car in colour on a transparent background                                                           |
| `icon.svg`     | The car in one colour (`currentColor`) with real holes, for Android's themed icon and coloured surfaces |

`scripts/build-icons.mjs` makes everything else from these two and adds the dark blue tile:

```sh
mise exec -- npm run build-icons --workspace packages/theme
mise exec -- npm run generate-og-image --workspace apps/web
```

It writes the app icon, the Android adaptive icon (background, foreground, monochrome), the splash
image, the iOS icon layer, the app's web favicon and the website's `favicon.svg`. The OG image is
made from that `favicon.svg`, so run the second command after the first.
