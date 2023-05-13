<script lang="ts">
	// The ordering of these imports is critical to your app working properly
	import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
	// If you have source.organizeImports set to true in VSCode, then it will auto change this ordering
	import '@skeletonlabs/skeleton/styles/all.css';
	// Most of your app wide CSS should be put in this file
	import '../app.postcss';
	import { computePosition, autoUpdate, offset, shift, flip, arrow } from '@floating-ui/dom';
	import { Toast, Modal, storePopup } from '@skeletonlabs/skeleton';

	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';

	storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
</script>

<Header />

<slot />

<Footer />

<Modal />
<Toast />
