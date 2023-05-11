<script lang="ts">
	export let base_nav_items: any = [],
		extra_nav_items: any = [];
</script>

<header>
	<div class="flex p-4 container mx-auto justify-between">
		<picture class="basis-[10%]">
			<source media="(min-width: 0px)" srcset="logo.svg" />
			<img src="logo.svg" alt="Logo of the company" />
		</picture>

		<span class="flex gap-x-4">
			<nav class="list-nav">
				<ul class="flex [&_li]:!m-0 gap-x-1">
					{#each base_nav_items as item}
						<li><a href="/">Тарифы</a></li>
					{:else}
						<li><a href="/">Тарифы</a></li>
						<li><a href="/">Возможности</a></li>
						<li><a href="/">Войти</a></li>
					{/each}
				</ul>
			</nav>
			<nav>
				<ul class="flex [&_li]:!m-0 gap-x-2">
					{#each extra_nav_items as item}
						<li class=""><a href="/" class="btn variant-ringed-secondary">Регистрация</a></li>
					{:else}
						<li class=""><a href="/" class="btn variant-ringed-secondary">Регистрация</a></li>
					{/each}
				</ul>
			</nav>
		</span>
	</div>
</header>
