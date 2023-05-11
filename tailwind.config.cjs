/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		require('path').join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {}
	},
	plugins: [
		// require('@tailwindcss/typography'), 	// npm install -D @tailwindcss/typography
		// require('@tailwindcss/forms'), 		// npm install -D @tailwindcss/forms
		...require('@skeletonlabs/skeleton/tailwind/skeleton.cjs')()
	]
};
