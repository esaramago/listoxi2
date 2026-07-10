<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '@/lib/db';
	import { pb } from '@/lib/pb';
	import Header from '@/components/Header.svelte';
	import EmptyState from '@/components/EmptyState.svelte';
	import SyncBadge from '@/components/SyncBadge.svelte';
	import Grid from '@/components/ui/Grid.svelte'

	// Reactive query for lists with their corresponding item counts
	const listsWithCounts = liveQuery(async () => {
		const allLists = await db.lists.where('sync_status').notEqual('deleted').toArray()
		const result = [];
		for (const list of allLists) {
			const count = await db.items
				.where('list')
				.equals(list.id)
				.and((item) => item.sync_status !== 'deleted')
				.count()
			result.push({ ...list, count })
		}
		return result
	})

	function logout() {
		if (confirm('Deseja realmente sair?')) {
			pb.authStore.clear()
		}
	}

	let isDark = $state(false);

	// Watch theme state
	if (typeof window !== 'undefined') {
		isDark = document.documentElement.classList.contains('wa-dark')
	}

	function toggleTheme() {
		isDark = !isDark
		if (isDark) {
			document.documentElement.classList.add('wa-dark')
			localStorage.setItem('theme', 'dark')
		} else {
			document.documentElement.classList.remove('wa-dark')
			localStorage.setItem('theme', 'light')
		}
	}
</script>

<div class="container">
	<Header title="Listoxi">
		{#snippet actions()}
			<wa-button circle variant="text" onclick={toggleTheme} title="Alternar Tema">
				<wa-icon name={isDark ? 'sun' : 'moon'} />
			</wa-button>
			<wa-button circle variant="text" onclick={logout} title="Sair da Conta">
				<wa-icon name="arrow-right-from-bracket" />
			</wa-button>
		{/snippet}
	</Header>

	<!-- Lists container -->

	<div>
		{#if !$listsWithCounts}
			<div class="loading-state">
				A carregar listas...
			</div>
		{:else if $listsWithCounts.length === 0}
			<EmptyState
				icon="cloud"
				title="Nenhuma lista criada"
				subtitle="Crie a sua primeira lista de compras clicando no botão abaixo."
				actionText="Criar Lista"
				actionHref="/lists/create"
				actionIcon="plus"
			/>
		{:else}
      <Grid direction="column">
        <Grid justify="space-between" align="center">
				  <SyncBadge />
          <wa-button href="/lists/create" variant="brand" appearance="plain">
            <wa-icon name="plus"></wa-icon>
            Adicionar lista
          </wa-button>
        </Grid>
        {#each $listsWithCounts as list (list.id)}
          <a href="/lists/{list.id}" class="card">
            <wa-card>
              <div>
                {#if list.emoji}
                  {list.emoji}
                {:else}
                  🍏
                {/if}
                <span>{list.name}</span>
              </div>
              <div class="card__count">
                <span class="card__number">{list.count}</span>
                <span class="card__label">
                  {list.count === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
            </wa-card>
          </a>
        {/each}
      </Grid>
		{/if}
	</div>

</div>

<style>
	.loading-state {
		text-align: center;
		padding: var(--wa-space-2xl);
		color: var(--wa-color-neutral-60);
	}
  .card {
    display: flex;
    width: 100%;
    text-decoration: none;
    justify-content: space-between;
    font-weight: 700;
    font-size: var(--wa-font-size-xl);
    wa-card {
      width: 100%;
      &::part(body) {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    }
  }
  .card__count {
    display: flex;
    flex-direction: column;
    text-align: center;
  }
  .card__number {
    font-size: var(--wa-font-size-3xl);
    font-weight: 900;
  }
  .card__label {
    font-size: var(--wa-font-size-s);
    font-weight: 400;
  }
</style>
