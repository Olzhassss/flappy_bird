# WHAT'S IN HERE?

- TypeScripted SvelteKit app
- Prettier + ESLint
- Vitest
- SkeletonCSS on TailwindCSS with postcss
- Licude? Fontsource?

# Setup

### Create SvelteKit project

```
// Creates new folder or overwrites files in an existing one
npm create svelte@latest my-app
```

### Utilities

````
// Adapter
npm i -D @sveltejs/adapter-static --save-dev
// Github Pages: https://kit.svelte.dev/docs/adapter-static

// Prettier:
npx prettier --write --no-bracket-spacing .```

// ESLint:
npx eslint --cache .```

// Lucide Svelte icons: https://lucide.dev/docs/lucide-svelte
npm i lucide-svelte --save-dev

// Fonts:
npm i @fontsource/open-sans

// Skeleton Svelte CSS
npm create skeleton-app@latest <app-name>
// https://www.skeleton.dev/utilities/popups

// Pico CSS
npm install @picocss/pico --save-dev

// Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
// Add postcss.config.cjs
// Forms: https://github.com/tailwindlabs/tailwindcss-forms
// Typography: https://tailwindcss.com/docs/typography-plugin

// SWIPER V9
npm install swiper --save-dev
````

# Structure

```
my-project/
├ src/
│ ├ lib/
│ │ ├ server/
│ │ │ └ [your server-only lib files]
│ │ └ [your lib files]
│ ├ params/
│ │ └ [your param matchers]
│ ├ routes/
│ │ └ [your routes]
│ ├ app.html
│ ├ error.html
│ ├ hooks.client.js
│ └ hooks.server.js
├ static/
│ └ [your static assets]
├ tests/
│ └ [your tests]
├ package.json
├ svelte.config.js
├ tsconfig.json
└ vite.config.js
```
