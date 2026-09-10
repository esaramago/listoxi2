<script lang="ts">
	import { liveQuery } from 'dexie'
	import { db } from '@/lib/db'
	import { pb, currentUser } from '@/lib/pb'
	import { triggerSync } from '@/lib/sync'
	import Header from '@/components/Header.svelte'
	import EmptyState from '@/components/EmptyState.svelte'
	import SyncBadge from '@/components/SyncBadge.svelte'
	import Grid from '@/components/ui/Grid.svelte'

	// Get current user ID
	const userId = $derived($currentUser?.id || '');

	// Reactive query for lists with their corresponding item counts
	const listsWithCounts = liveQuery(async () => {
		const allLists = await db.lists.where('sync_status').notEqual('deleted').toArray()
		const result = [];
		for (const list of allLists) {
			const count = await db.items
				.where('list')
				.equals(list.id)
				.and((item) => !item.bought && item.sync_status !== 'deleted')
				.count()
			result.push({ ...list, count })
		}
		return result
	})

	// Derived sorted lists based on user's sort order
	const sortedLists = $derived(
		$listsWithCounts?.slice().sort((a, b) => {
			const aOrder = a.user_sort_order?.[userId] ?? Number.MAX_SAFE_INTEGER;
			const bOrder = b.user_sort_order?.[userId] ?? Number.MAX_SAFE_INTEGER;
			return aOrder - bOrder;
		}) || []
	);

	// Reorder a list by swapping positions
	async function reorderList(listId: string, newIndex: number) {
		if (!userId) return;

		const allLists = await db.lists.where('sync_status').notEqual('deleted').toArray();
		
		// Find the list we're moving
		const listToMove = await db.lists.get(listId);
		if (!listToMove) return;

		// Get the current index of the list we're moving
		const currentIndex = sortedLists.findIndex(l => l.id === listId);
		if (currentIndex === -1) return;

		// Build new sort orders for all lists
		const newSortOrders: Record<string, Record<string, number>> = {};
		
		for (let i = 0; i < sortedLists.length; i++) {
			const list = sortedLists[i];
			const currentOrder = list.user_sort_order || {};
			
			if (list.id === listId) {
				// This is the list being moved
				newSortOrders[list.id] = { ...currentOrder, [userId]: newIndex };
			} else if (i === newIndex) {
				// The list that was at newIndex gets moved to currentIndex
				newSortOrders[list.id] = { ...currentOrder, [userId]: currentIndex };
			} else {
				// All other lists keep their order
				newSortOrders[list.id] = currentOrder;
			}
		}

		// Update all affected lists
		for (const [listIdToUpdate, sortOrder] of Object.entries(newSortOrders)) {
			const list = await db.lists.get(listIdToUpdate);
			if (list) {
				await db.lists.update(listIdToUpdate, {
					user_sort_order: sortOrder,
					sync_status: list.sync_status === 'created' ? 'created' : 'updated',
					updated: new Date().toISOString()
				});
			}
		}
		
		triggerSync();
	}

	// Move list up in the order
	async function moveListUp(listId: string) {
		const listIndex = sortedLists.findIndex(l => l.id === listId);
		if (listIndex > 0) {
			await reorderList(listId, listIndex - 1);
		}
	}

	// Move list down in the order
	async function moveListDown(listId: string) {
		const listIndex = sortedLists.findIndex(l => l.id === listId);
		if (listIndex >= 0 && listIndex < sortedLists.length - 1) {
			await reorderList(listId, listIndex + 1);
		}
	}

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

  function goToAdmin() {
    window.open(
      'https://listoxi-admin.emanuelsaramago.com/_',
      '_blank'
    )
  }
</script>

<div class="container">
	<Header title="Listoxi">
		{#snippet actions()}
			<wa-dropdown-item onclick={toggleTheme}>
				<wa-icon slot="icon" name={isDark ? 'sun' : 'moon'}></wa-icon>
				Alternar Tema
			</wa-dropdown-item>
			<wa-dropdown-item onclick={goToAdmin()}>
				<wa-icon slot="icon" name="cog"></wa-icon>
				Administra\u00e7\u00e3o
			</wa-dropdown-item>
			<wa-dropdown-item onclick={logout}>
				<wa-icon slot="icon" name="arrow-right-from-bracket"></wa-icon>
				Sair da Conta
			</wa-dropdown-item>
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
				subtitle="Crie a sua primeira lista de compras clicando no bot\u00e3o abaixo."
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
        {#each sortedLists as list (list.id)}
          <div class="card-container">
            <a href="/lists/{list.id}" class="card">
              <wa-card>
                <div>
                  {#if list.emoji}
                    {list.emoji}
                  {:else}
                    \ud83c\udf4f
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
            <div class="card-actions">
              <wa-button 
                circle 
                appearance="plain" 
                variant="neutral"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); moveListUp(list.id); }}
                disabled={sortedLists[0]?.id === list.id}
                title="Mover para cima"
              >
                <wa-icon name="chevron-up"></wa-icon>
              </wa-button>
              <wa-button 
                circle 
                appearance="plain" 
                variant="neutral"
                onclick={(e) => { e.preventDefault(); e.stopPropagation(); moveListDown(list.id); }}
                disabled={sortedLists[sortedLists.length - 1]?.id === list.id}
                title="Mover para baixo"
              >
                <wa-icon name="chevron-down"></wa-icon>
              </wa-button>
            </div>
          </div>
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
.card-container {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--wa-space-s);
}
.card {
  display: flex;
  flex: 1;
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
.card-actions {
  display: flex;
  flex-direction: column;
  gap: var(--wa-space-3xs);
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
