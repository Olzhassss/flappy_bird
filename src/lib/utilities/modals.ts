import type { ModalSettings } from '@skeletonlabs/skeleton';

export const promptModal: ModalSettings = {
	type: 'prompt',
	title: 'Submit Score to the Leaderboard',
	body: 'Provide a nickname to submit your score.',
	value: 'Anonymous Grand Floppus',
	valueAttr: { type: 'text', minlength: 3, maxlength: 25, required: true },
	response: (r: string | false) => r && dispatchEvent( new Event('modal_submit') )
};