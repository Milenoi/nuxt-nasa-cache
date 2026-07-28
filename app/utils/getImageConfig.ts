const shared = {
  quality: 80,
  format: ["avif", "webp"],
  // Allowlist for transforming remote images (also mirrored in netlify.toml).
  domains: ["apod.nasa.gov", "img.youtube.com", "i.ytimg.com"],
  // Tailwind's breakpoints minus 1px, so a `sizes` prop can be written in the
  // units the layout is built in: `lg:` here covers exactly the viewports where
  // Tailwind's `lg:` classes apply. The -1 is not a typo — Nuxt Image emits
  // `(max-width: <screen>)` while Tailwind uses `(min-width: <bp>)`, so a plain
  // 1024 would still serve the md width at exactly 1024px wide.
  // Any other ladder silently shifts every media query in every `sizes`
  // attribute: `lg:` resolving to 1600 instead of 1024 is what made phones
  // download the desktop-sized image. The page is capped at 1920, so no image
  // ever needs to be wider than that.
  screens: {
    sm: 639,
    md: 767,
    lg: 1023,
    xl: 1279,
    "2xl": 1535,
  },
};

// Production (Netlify) → Netlify Image CDN (/.netlify/images) at the edge, no
// serverless IPX. Local `nuxt dev` → IPX, since /.netlify/images isn't available.
const imageConfig =
  process.env.NODE_ENV === "development"
    ? shared
    : { provider: "netlify", ...shared };

export default imageConfig;
