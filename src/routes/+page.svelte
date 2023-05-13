<script lang="ts">
	import highest_score from '$lib/utilities/score_store';
	import { error } from '@sveltejs/kit';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { ProgressRadial, modalStore, popup, toastStore } from '@skeletonlabs/skeleton';
	import { focusAction } from '$lib/utilities/focus_action';
	import { promptModal } from '$lib/utilities/modals';
	import { Howl } from 'howler';

	/**
	 * Object type for managing obstacle states
	 */
	type Obstacle = {
		lpipe_offset: number; // lower pipe offset (distance from the upper border to the lower pipe beginning)
		upipe_offset: number; // upper pipe offset (distance from the upper border to the upper pipe end)
		x: number; // x offset of the left-most pixel of the obstacle
	};

	/**
	 * Loading - until game screen and images are loaded
	 * Initial state - geme screen loaded with game title
	 * Game ready - bird at the initial position above moving ground (after Initial state / Gave over)
	 * Game over - a running game ended
	 * Running - a game is running
	 */
	type State = 'Loading' | 'Initial state' | 'Game ready' | 'Game over' | 'Running';

	type BirdState = 'Gliding' | 'Jumping' | 'Falling';
	// used to keep bird state and different animation
	type BirdObject = {
		state: BirdState;
		frames_in_jump: number;
	};

	// Configuration:
	const ui_height = 512; // game screen height
	const default_speed = 2; // number of pixels the surroundings are moved per frame, by default.
	let speed = default_speed; // actual number of pixels the surroundings are moved per frame, changed with difficulty.
	const delay = 16; // inverse of frame rate; sets highest boundary for the frame rate of ~60 Hertz

	const bird_timing_contant = 36; // # of frames for the jump animation after which `bird_y_offset` equals the value prior to the animation start
	const bird_rise_amount = 6; // maximum change of vertical velocity (height) of the bird
	const bird_frames_per_flap_change = 4; // number of frames before wings' position (bird image) is changed to next
	let bird_oscillation_velocity = 0.3; // change of y position of the bird per frame during the oscillations before new game is started

	const first_obsctacle_spawn_frame = 70; // used to control the timing of the first obstacle
	const pipe_spawn_interval = 270; // distance in pixels between consequtive obstacles
	const opening_height_half = 50; // half the height of an opening in the obstacle in pixels
	const minimal_pipe_height = 35; // minimal pipe protrusion amount in pixels
	const max_difficulty = 8; // sets upper bound for `speed` as ``

	// Declaration & initialization
	let state: State = 'Loading';
	let bird_obj: BirdObject = {
		state: 'Gliding',
		frames_in_jump: 0
	};

	let ground_offset = 0; // y offset of the ground
	let bird_x_offset = 0; // x offset of the bird
	let bird_y_offset = 0; // y offset of the bird
	let bird_img_height = 0; // additional var to keep track of image height
	let bird_img_width = 0; // additional var to keep track of image height

	let obstacles: Array<Obstacle> = []; // queue for drawing obstacles
	let next_obstacles: Array<Obstacle> = []; // queue for checking collision and scoring
	let prevTimestamp = 0; // timestamp of the previous frame (used to control frame rate)
	let elapsed_frames = 0; // # of frames elapsed since the game started (used to control frame rate)
	let difficulty = 0; // Temp variable to keep difficulty state
	let last_obstacle_frame = first_obsctacle_spawn_frame; // Temp variable to control obstacle spawn rate

	// maximum and minimum offsets for the opening's center
	let opening_max_offset: number;
	let opening_min_offset: number;

	let score = 0; // last game score

	let bg: HTMLCanvasElement,
		base: HTMLCanvasElement,
		bg_ctx: CanvasRenderingContext2D,
		base_ctx: CanvasRenderingContext2D;

	let bg_img: HTMLImageElement, ground_img: HTMLImageElement, obst_img: HTMLImageElement;
	let bird_imgs: Array<HTMLImageElement>;

	// Set up audio
	const audio = {
		point: new Howl({
			src: ['audio/point.ogg', 'audio/point.wav'],
			onload: () => addEventListener('point', () => audio.point.play())
		}),
		wing: new Howl({
			src: ['audio/wing.ogg', 'audio/wing.wav'],
			onload: () => addEventListener('wing', () => audio.wing.play())
		}),
		hit: new Howl({
			src: ['audio/hit.ogg', 'audio/hit.wav'],
			onload: () => addEventListener('hit', () => audio.hit.play())
		}),
		die: new Howl({
			src: ['audio/die.ogg', 'audio/die.wav'],
			onload: () => addEventListener('die', () => audio.die.play())
		}),
		swoosh: new Howl({
			src: ['audio/swoosh.ogg', 'audio/swoosh.wav'],
			onload: () => addEventListener('swoosh', () => audio.swoosh.play())
		})
	};

	onMount(mountGame);

	async function mountGame() {
		// Initialization 2
		(bg = document.getElementById('background')), (base = document.getElementById('base'));
		(bg_ctx = bg.getContext('2d')), (base_ctx = base.getContext('2d'));

		if (!bg_ctx || !base_ctx) raiseError('Canvas rendering context is null.');

		bg.width = window.innerWidth;
		base.width = window.innerWidth;

		// Load images
		bg_img = new Image();
		ground_img = new Image();
		obst_img = new Image();
		bird_imgs = new Array(3).fill(undefined).map(() => new Image());
		await loadImage('sprites/background-day.png', bg_img);
		await loadImage('sprites/base.png', ground_img);
		await loadImage('sprites/bluebird-upflap.png', bird_imgs[2]);
		await loadImage('sprites/bluebird-midflap.png', bird_imgs[1]);
		await loadImage('sprites/bluebird-downflap.png', bird_imgs[0]);
		await loadImage('sprites/pipe-green.png', obst_img);

		bird_img_height = bird_imgs[0].height;
		bird_img_width = bird_imgs[0].width;

		// Set up positioning
		ground_offset = base.height - ground_img.height;
		bird_x_offset = base.width / 2 - bird_img_width;
		bird_y_offset = base.height / 2;

		opening_max_offset = Math.min(
			obst_img.height + opening_height_half * 2,
			ground_offset - minimal_pipe_height - opening_height_half
		);
		opening_min_offset = Math.max(
			ground_offset - obst_img.height - opening_height_half * 2,
			minimal_pipe_height + opening_height_half
		);

		// Draw background
		requestAnimationFrame(drawBackground);

		// Set up event listeners
		addEventListener('resize', resizeHandler);
		addEventListener('keydown', handleKeydown);
		addEventListener('modal_submit', submitHandler);

		state = 'Initial state';
	}

	/**
	 * on whitespace keydown, restarts bird jump animation and starts new game if state is `'Game ready'`
	 * @param event
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === ' ') {
			bird_obj.frames_in_jump = 0;
			if (state === 'Game ready' || state === 'Running') {
				bird_obj.state = 'Jumping';
				if (!event.repeat) dispatchEvent(new Event('wing'));
			}
			if (state === 'Game ready') {
				requestAnimationFrame(drawNextStep);
				state = 'Running';
			}
		}
	}

	/**
	 * main animation function that clears canvas and redraws elements. Also manages states and difficulty
	 * @param timestamp
	 */
	function drawNextStep(timestamp: number) {
		if (timestamp - prevTimestamp > delay) {
			prevTimestamp = timestamp;
			elapsed_frames++;
			base_ctx.clearRect(0, 0, base.width, base.height);
			if (state === 'Running') drawObstacles(base_ctx);
			drawBird(base_ctx);
			drawGround(base_ctx);
			if (detectCollisionAndScore()) {
				state = 'Game over';
			}
		}

		updateDifficulty();

		if (state !== 'Game over') requestAnimationFrame(drawNextStep);
		else document.getElementById('restart')?.focus();
	}

	/**
	 * draws multiple background images to cover full canvas width
	 */
	function drawBackground() {
		if (!bg_img.complete) {
			alert('Failed to load background image!');
			return;
		}
		for (let x = 0; x < bg.width; x += bg_img.width) bg_ctx.drawImage(bg_img, x, 0);
	}

	let ground_position = 0;
	/**
	 * draws multiple ground images to cover full width of the canvas using `ground_position`
	 * @param ctx - appropriate canvas context for drawing the background
	 */
	function drawGround(ctx: CanvasRenderingContext2D) {
		for (let x = ground_position; x < base.width; x += ground_img.width)
			ctx.drawImage(ground_img, x, ground_offset);

		ground_position -= speed;

		if (ground_position < -ground_img.width) ground_position += ground_img.width;
	}

	/**
	 * spawns and removes obstacles, draws all existing obstacles and shifts to the left by `speed`
	 * @param ctx - appropriate canvas context for drawing obstacles
	 */
	function drawObstacles(ctx: CanvasRenderingContext2D) {
		/**
		 * creates an `Obstacle` object with random paraments and appends it to `obstacles` and `next_obstacles`
		 */
		function spawnObstacle() {
			const opening_offset = Math.round(
				Math.random() * (opening_max_offset - opening_min_offset) + opening_min_offset
			); // y offset of the opening's center
			let obstacle: Obstacle = {
				lpipe_offset: opening_offset + opening_height_half,
				upipe_offset: opening_offset - opening_height_half,
				x: base.width + obst_img.width
			};
			obstacles.push(obstacle);
			next_obstacles.push(obstacle);
		}

		if (elapsed_frames - last_obstacle_frame > pipe_spawn_interval / speed) {
			spawnObstacle();
			last_obstacle_frame = elapsed_frames;
		}
		for (let i = 0; i < obstacles.length; i++) {
			const o = obstacles[i];
			// Drawing lower pipe
			ctx.drawImage(obst_img, o.x, o.lpipe_offset);
			// Drawing upper pipe
			ctx.translate(o.x + obst_img.width / 2, o.upipe_offset);
			ctx.rotate(Math.PI);
			ctx.translate(-o.x - obst_img.width / 2, -o.upipe_offset);
			ctx.drawImage(obst_img, o.x, o.upipe_offset);
			// Resetting transform matrix to draw as usual
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			// Recalculating the obstacle's position
			o.x -= speed;
		}
		if (obstacles.length && obstacles[0].x < 0 - obst_img.width) {
			obstacles.shift();
		}
	}

	/**
	 * manages bird states, vertical position, angle and animation
	 * @param ctx - appropriate canvas context for drawing the bird
	 */
	function drawBird(ctx: CanvasRenderingContext2D) {
		/**
		 * draws bird at an angle from a horizontal line, clockwise
		 * @param img - bird image element to be drawn
		 * @param angle	- angle in radians
		 */
		function drawAngledBird(img: HTMLImageElement, angle: number) {
			ctx.translate(bird_x_offset + bird_img_width / 2, bird_y_offset + bird_img_height / 2);
			ctx.rotate(angle);
			ctx.translate(-bird_img_width / 2, -bird_img_height / 2);
			ctx.drawImage(img, 0, 0);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
		}
		updateBirdY();

		if (bird_obj.frames_in_jump > bird_timing_contant) bird_obj.state = 'Falling';

		let img = bird_imgs[0];
		if (bird_obj.state === 'Gliding') {
			img = bird_imgs[1];
			ctx.drawImage(img, bird_x_offset, bird_y_offset);
		} else if (bird_obj.state === 'Falling') {
			img = bird_imgs[1];
			let angle =
				(((2 / 5) * Math.PI) / 20) * (bird_obj.frames_in_jump - bird_timing_contant) - Math.PI / 5;
			drawAngledBird(img, Math.min(angle, Math.PI / 4));
		} else {
			img = bird_imgs[Math.round(bird_obj.frames_in_jump / bird_frames_per_flap_change) % 3];
			drawAngledBird(img, -Math.PI / 5);
		}
	}
	/**
	 * calculates next y offset of the bird depending on `state`, `bird_obj.frames_in_jump` and the timing function
	 */
	function updateBirdY() {
		/**
		 * simulates velocity change for a jump with followed free fall using configurable parameters. Also disallows to fly above borders.
		 *
		 * The graph looks like `dy/dx = k-x for x=[0, bird_timing_contant]` and
		 * `dy/dx = -b for x>bird_timing_constant`, where `y` is the birds's y position.
		 *
		 * Positive return value corresponds to higher y offset => lower y position
		 * @param x - distance travelled since last jump
		 */
		function timing_function(x: number) {
			if (x < bird_timing_contant) return bird_rise_amount * ((x * 2) / bird_timing_contant - 1);
			return bird_rise_amount;
		}

		if (state === 'Game ready') {
			// oscillatory movement
			if (bird_y_offset < (base.height - 10) / 2) bird_oscillation_velocity *= -1;
			if (bird_y_offset > (base.height + 10) / 2) bird_oscillation_velocity *= -1;
			bird_y_offset += bird_oscillation_velocity;
		} else {
			// jump and fall movement
			bird_y_offset += timing_function(bird_obj.frames_in_jump);
			bird_obj.frames_in_jump++;
		}

		if (bird_y_offset < 0) bird_y_offset = 0;
	}

	/**
	 * returns `true` if the bird collides with an obstacle or touches the ground and dispatches corresponding sound event.
	 *
	 * Increments game score after passing through an opening
	 */
	function detectCollisionAndScore() {
		// check collision with the ground
		if (bird_y_offset >= ground_offset - bird_img_height) {
			dispatchEvent(new Event('die'));
			return true;
		}

		if (!obstacles.length) return false;

		// increment the score and shift next obstacles queue
		if (next_obstacles[0].x + obst_img.width < bird_x_offset) {
			score++;
			dispatchEvent(new Event('point'));
			next_obstacles.shift();
		}

		// check collision with the next obstacle
		let o = next_obstacles[0];
		if (bird_x_offset + bird_img_width >= o.x && bird_x_offset <= o.x + obst_img.width) {
			if (bird_y_offset <= o.upipe_offset || bird_y_offset + bird_img_height >= o.lpipe_offset) {
				dispatchEvent(new Event('hit'));
				return true;
			}
		}

		return false;
	}

	/**
	 * gradually increments speed by a fraction every 12 scores up until `speed = 2 * default_speed` when player reaches a score of 100.
	 */
	function updateDifficulty() {
		if (score > 6 + difficulty * 12 && difficulty <= max_difficulty) {
			difficulty += 0.2;
			speed = default_speed + (difficulty / max_difficulty) * default_speed;
		}
	}

	/**
	 * resets canvas widths, requests background redraw and ends current game
	 */
	function resizeHandler() {
		bg.width = window.innerWidth;
		base.width = window.innerWidth;
		bird_x_offset = base.width / 2 - bird_img_width;
		requestAnimationFrame(drawBackground);
		requestAnimationFrame(() => drawGround(base_ctx));
		if (state === 'Running') state = 'Game over';
	}

	/**
	 * resets state to `Game ready` and starts a new game
	 */
	function reset() {
		bird_x_offset = base.width / 2 - bird_img_width;
		bird_y_offset = base.height / 2;
		bird_obj.state = 'Gliding';
		bird_obj.frames_in_jump = 0;
		state = 'Game ready';
		elapsed_frames = 0;
		last_obstacle_frame = first_obsctacle_spawn_frame;
		prevTimestamp = 0;
		obstacles = [];
		next_obstacles = [];
		score = 0;
		difficulty = 0;
		speed = default_speed;
		requestAnimationFrame(drawNextStep);
	}

	/**
	 * returns the score converted to an array of individual digits
	 * @param score game score
	 */
	function divideScore(score: number) {
		let arr: Array<number> = [];
		arr.push(score % 10);
		score = Math.floor(score / 10);
		while (score > 0) {
			arr.push(score % 10);
			score = Math.floor(score / 10);
		}
		return arr.reverse();
	}

	// keeping track of the highest score, synchronized with local store
	let highest = Number.parseInt($highest_score);
	$: {
		if (score > highest) {
			highest_score.set(score.toString());
		}
	}

	// Small util functions
	function raiseError(text: string = 'Canvas not found!') {
		alert(text);
		throw error(400, 'Do not edit the page :(');
	}

	function handleStart() {
		state = 'Game ready';
		requestAnimationFrame(drawNextStep);
	}

	async function loadImage(url: string, elem: HTMLImageElement) {
		return new Promise((resolve, reject) => {
			elem.onload = () => resolve(elem);
			elem.onerror = reject;
			elem.src = url;
		});
	}

	// shortcut for dispatching swoosh sound (other methods to dispach an event were unsuccessful)
	const click = () => dispatchEvent(new Event('swoosh'));

	// submit to leaderboard
	async function submitHandler() {
		const res = await fetch('/api/leaderboard', {
			method: 'POST',
			body: JSON.stringify({ 
				name: "No nickname",
				score
			}),
			headers: {
				'content-type': 'application/json'
			}
		});

		if (res.status == 200)
			toastStore.trigger({
				message: 'Successfully submitted your score!',
				background: 'variant-filled-success'
			});
		else
			toastStore.trigger({
				message: 'Oops, some error occured during submission!',
				background: 'variant-filled-error'
			});
			
		console.log(await res.text());
	}

	// Unresolved issue with submitting correct nickname
	// let nickname = $modalStore[0]?.value ?? '';
	// $: nickname, console.log($modalStore[0]?.value);
</script>

<title>Flappy Bird &bull; Olzhas Toleutay</title>

<div class="w-full relative overflow-hidden" style="height: {ui_height}px;">
	<div class="relative w-full h-full bg-slate-600 content-center grid">
		<ProgressRadial class={'mx-auto'} width={'w-24'} />
		{#if state === 'Initial state'}
			<div class="absolute w-full top-[30%] text-center z-10 font-custom">
				<h1 class="text-orange-400">Flappy Bird</h1>
				<br />
				<button
					id="start"
					on:click={() => {
						handleStart();
						click();
					}}
					use:focusAction
					class="p-2 focus:animate-pulse focus:outline-0 focus:border-opacity-100 border-opacity-0 border-b-2 border-orange-500 hover:opacity-50 transition-all"
				>
					<h2>Play &crarr;</h2>
				</button>
			</div>
		{/if}
		{#if state !== 'Initial state' && state !== 'Loading'}
			<div class="w-full absolute top-10 z-10 flex justify-left ml-10 pointer-events-none">
				{#if score > 0}
					{#each divideScore(score) as digit}
						<img src="sprites/{digit}.png" alt={digit.toString()} class="-ml-1" />
					{/each}
				{:else}
					<img src="sprites/0.png" alt="0" />
				{/if}
			</div>
		{/if}
		{#if state === 'Game ready'}
			<div class="w-full absolute bottom-8 z-10 pointer-events-none text-center">
				<span class="font-custom text-3xl uppercase blink">Press &lt;WhiteSpace&gt; to start</span>
			</div>
		{/if}
		{#if state === 'Game over'}
			<div
				class="absolute top-0 left-0 z-20 w-full h-full grid justify-center bg-gray-500 bg-opacity-30 pointer-events-none"
				in:fade={{ duration: 300 }}
			>
				<div class="mt-24 z-10 space-y-8 font-custom text-xl">
					<img src="sprites/gameover.png" alt="Game over" class="block mx-auto" />
					<ul class=" bg-white bg-opacity-90 border-2 border-[#533545] p-3 text-orange-400">
						{#if score > highest}
							<li class="text-orange-700 text-2xl my-3 animate-bounce text-center">New record!</li>
						{/if}
						<li>Your score: {score}</li>
						<li>Highest score: {highest}</li>
					</ul>
					<div class="pointer-events-auto space-y-2 flex flex-col">
						<button
							id="restart"
							class="button-custom "
							on:click={() => {
								reset();
								click();
							}}>Restart</button
						>
						<button
							class="button-custom "
							use:popup={{ event: 'click', target: 'popupClick', placement: 'bottom' }}
							on:click={click}>Share</button
						>
						<button
							class="button-custom"
							on:click={() => {
								modalStore.trigger(promptModal);
								click();
							}}>Add to leaderboard</button
						>
						<a href="/leaderboard"><button
							class="button-custom w-full"
							>Leaderboard</button
						>
						</a>
					</div>
				</div>
			</div>
		{/if}
		<canvas id="background" class="block absolute top-0 left-0" height={ui_height} />
		<canvas id="base" height={ui_height} class="block absolute left-0" />
	</div>

	<div class="card p-4 variant-filled z-20" data-popup="popupClick">
		<div class="btn-group-vertical variant-filled">
			<a class="hover:!underline" target="blank" href="https://www.facebook.com/sharer.php"
				>Facebook</a
			>
			<a
				class="hover:!underline"
				target="blank"
				href="https://twitter.com/intent/tweet?text=Wow!%20I%20scored%20{score}%20in%20Flappy%20Bird%20by%20Olzhas!&hashtags=flappy_bird,game"
				>Twitter</a
			>
		</div>
		<div class="arrow variant-filled" />
	</div>
</div>
