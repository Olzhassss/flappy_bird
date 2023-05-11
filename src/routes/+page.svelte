<script lang="ts">
	import { error } from '@sveltejs/kit';
	import { onMount } from 'svelte';

	const ui_height = 512;
	let speed = 2; // number of pixels the surroundings are moved per frame.
	const delay = 16; // inverse of frame rate; sets highest boundary for the frame rate of ~60 Hertz
	let score = 123456790;

	type State = 'Initial state' | 'Game over' | 'Running';
	type BirdState = 0 | 1 | 2 | 3;

	let bird_state: BirdState = 0;
	// number of frames for the jump animation after which bird_y equals the value prior to the animation start
	const bird_animation_fullcycle_frames = 35,
		bird_rise_amount = 5; // maximum change of vertical velocity (height) of the bird
	let bird_animation_frame = 0; // var to keep state of the jump animation

	const pipe_spawn_interval = 300; // distance in pixels between consequtive obstacles

	const bg_img = new Image(),
		ground_img = new Image(),
		bird_img = new Image(),
		obst_img = new Image();
	bg_img.src = 'sprites/background-day.png';
	ground_img.src = 'sprites/base.png';
	bird_img.src = 'sprites/bluebird-midflap.png';
	obst_img.src = 'sprites/pipe-green.png';

	const mountGame = () => {
		// Initialization
		let state: State = 'Initial state';
		const bg: HTMLCanvasElement = document.getElementById('background'),
			base: HTMLCanvasElement = document.getElementById('base');
		let bg_ctx: CanvasRenderingContext2D = bg.getContext('2d'),
			base_ctx: CanvasRenderingContext2D = base.getContext('2d');

		bg.width = window.innerWidth;
		base.width = window.innerWidth;

		const ground_offset = base.height - ground_img.height; // y offset of the ground
		const bird_x = base.width / 2 - bird_img.width;
		let bird_y = base.height / 2;
		let bird_oscillation_velocity = 0.3;

		let obstacles: Array<Obstacle> = []; // saving obstacles' states
		let last_obstacle_frame = 300 / speed; // Temp variable to control obstacle spawn rate

		const opening_height_half = 50,
			minimal_pipe_height = 35;
		const opening_max_offset = Math.min(
				obst_img.height + opening_height_half * 2,
				ground_offset - minimal_pipe_height - opening_height_half
			),
			opening_min_offset = Math.max(
				ground_offset - obst_img.height - opening_height_half * 2,
				minimal_pipe_height + opening_height_half
			);

		requestAnimationFrame(drawBackground);
		addEventListener('resize', resizeHandler);
		addEventListener('keydown', handleKeydown);
		requestAnimationFrame(drawNextStep);

		/**
		 * restarts bird jump animation and also starts new game if state is not `'Running'`
		 * @param event
		 */
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === ' ') {
				bird_animation_frame = 0;
				if (state === 'Initial state') {
					requestAnimationFrame(drawNextStep);
					state = 'Running';
				}
				if (state === 'Game over') {
					reset();
				}
			}
		}

		/**
		 * resets to `Initial state` and starts new game
		 */
		function reset() {
			bird_y = base.height / 2;
			state = 'Initial state';
			elapsed_frames = 0;
			prevTimestamp = 0;
			obstacles = [];
			score = 0;
			requestAnimationFrame(drawNextStep);
		}

		let prevTimestamp = 0,
			elapsed_frames = 0;
		function drawNextStep(timestamp: number) {
			if (timestamp - prevTimestamp > delay) {
				prevTimestamp = timestamp;
				elapsed_frames++;
				base_ctx.clearRect(0, 0, base.width, base.height);
				if (state === 'Running') drawObstacles(base_ctx);
				drawBird(base_ctx);
				drawGround(base_ctx);
				if (detectCollision()) state = 'Game over';
			}

			if (state !== 'Game over') requestAnimationFrame(drawNextStep);
		}

		/**
		 * draws multiple background images to cover full canvas width
		 */
		function drawBackground() {
			for (let x = 0; x < bg.width; x += bg_img.width) bg_ctx.drawImage(bg_img, x, 0);
			// drawGround(base_ctx);
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
		 * Object type for managing obstacle states
		 */
		type Obstacle = {
			lpipe_offset: number; // lower pipe offset (distance from the upper border to the lower pipe beginning)
			upipe_offset: number; // upper pipe offset (distance from the upper border to the upper pipe end)
			x: number; // x position of the left-most pixel of the obstacle
		};
		/**
		 * spawns and removes obstacles, draws all existing obstacles and shifts to the left by `speed`
		 * @param ctx - appropriate canvas context for drawing obstacles
		 */
		function drawObstacles(ctx: CanvasRenderingContext2D) {
			/**
			 * creates an `Obstacle` object with random paraments and appends it to `obstacles`
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
			}

			if (elapsed_frames - last_obstacle_frame > pipe_spawn_interval / speed) {
				spawnObstacle();
				last_obstacle_frame = elapsed_frames;
			}
			for (let i = 0; i < obstacles.length; i++) {
				// console.log(obstacles[i].x);
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
		 * manages bird position, animation and drawing
		 * @param ctx - appropriate canvas context for drawing obstacles
		 */
		function drawBird(ctx: CanvasRenderingContext2D) {
			updateBirdY();
			ctx.drawImage(bird_img, bird_x, bird_y);
		}
		/**
		 * calculates next y offset of the bird depending on `state` and the timing function
		 */
		function updateBirdY() {
			/**
			 * simulates velocity change for a jump with followed free fall using configurable parameters.
			 *
			 * The graph looks like `dy/dx = k-x for x=[0, bird_animation_fullcycle_frames]` and
			 * `dy/dx = -b`, where `y` is the birds's y position.
			 *
			 * Positive return value corresponds to higher y offset => lower y position
			 * @param x - current animation frame
			 */
			function timing_function(x: number) {
				if (x < bird_animation_fullcycle_frames)
					return bird_rise_amount * ((x * 2) / bird_animation_fullcycle_frames - 1);
				return bird_rise_amount;
			}

			if (state === 'Initial state') {
				// oscillatory movement
				if (bird_y < (base.height - 10) / 2) bird_oscillation_velocity *= -1;
				if (bird_y > (base.height + 10) / 2) bird_oscillation_velocity *= -1;
				bird_y += bird_oscillation_velocity;
			} else {
				// jump and fall movement
				bird_y += timing_function(bird_animation_frame++);
				if (bird_y >= ground_offset - bird_img.height) state = 'Game over';
			}
		}

		function detectCollision() {
			return false;
		}

		function resizeHandler() {
			bg.width = window.innerWidth;
			base.width = window.innerWidth;
			requestAnimationFrame(drawBackground);
		}
	};

	onMount(mountGame);

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

	function getBirdState() {
		return bird_state++ % 4;
	}

	function raiseError(text: String = 'Canvas not found!') {
		alert(text);
		return error(400);
	}
</script>

<div class="w-full bg-primary-300 relative overflow-hidden" style="height: {ui_height}px;">
	<div class="relative w-full h-full">
		<div class="w-full absolute top-10 z-10 flex justify-left ml-10 pointer-events-none">
			{#if score > 0}
				{#each divideScore(score) as digit}
					<img src="sprites/{digit}.png" alt="" class="-ml-1" />
				{/each}
			{:else}
				<img src="sprites/0.png" alt="" />
			{/if}
		</div>
		<canvas id="background" class="block absolute top-0 left-0" height={ui_height} />
		<canvas id="base" height={ui_height} class="block absolute left-0" />
	</div>
</div>
