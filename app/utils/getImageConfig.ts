const shared = {
  quality: 80,
  format: ["avif", "webp"],
  // Allowlist for transforming remote images (also mirrored in netlify.toml).
  domains: ["assets.science.nasa.gov", "img.youtube.com", "i.ytimg.com"],
  // Exactly Tailwind's breakpoints, so `lg:` in a `sizes` prop covers the same
  // viewports as Tailwind's `lg:` classes. Since @nuxt/image 2.1 the module emits
  // `(max-width: <screen - 1>px)` itself; the old hand-made -1 here would now be
  // subtracted twice. Any other ladder silently shifts every media query in every
  // `sizes` attribute: `lg:` resolving to 1600 instead of 1024 is what made
  // phones download the desktop-sized image. The page is capped at 1920, so no
  // image ever needs to be wider than that.
  screens: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },
};

// Production (Netlify) → Netlify Image CDN (/.netlify/images) at the edge, no
// serverless IPX. Local `nuxt dev` → IPX, since /.netlify/images isn't available.
const imageConfig =
  process.env.NODE_ENV === "development"
    ? shared
    : { provider: "netlify", ...shared };

export default imageConfig;
