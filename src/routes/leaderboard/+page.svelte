<script lang="ts">
    import type { PageData } from './$types';
    
    export let data: PageData;
</script>

<div class="container mx-auto">
    <a href="/" class="font-custom block mb-4 text-2xl !no-underline !text-secondary-50">&lAarr; Back to Game</a>
    <table class="table text-xl text-center">
        <thead>
            <th>Player</th>
            <th>Score</th>
        </thead>
        <tbody>
            {#each data.leaderboard as item}
            <tr>
                <td>{item.name}</td>
                <td>{item.score}</td>
            </tr>
            {:else}
            <tr>
                <td colspan="2">No scores found :( </td>
            </tr>
            {/each}
        </tbody>
    </table>
</div>