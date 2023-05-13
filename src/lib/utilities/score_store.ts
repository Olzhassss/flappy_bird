import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const defaultValue = '0';
const initialValue = browser
	? window.localStorage.getItem('highest_score') ?? defaultValue
	: defaultValue;

const highest_score = writable<string>(initialValue);

highest_score.subscribe((value) => {
	if (browser) {
		window.localStorage.setItem('highest_score', value);
	}
});

export default highest_score;
