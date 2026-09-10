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
	)

	// Drag and drop state
	let draggedId = $state<string | null>(null)
	let dragOverIndex = $state<number | null>(null)

	// Get the current order from sortedLists
	const currentOrder = $derived(sortedLists.map(l => l.id))

	// Display lists with drag reordering
	const displayLists = $derived.by(() => {
		if (draggedId === null || dragOverIndex === null) {
			return sortedLists
		}
		const draggedIndex = currentOrder.indexOf(draggedId)
		if (draggedIndex === -1 || draggedIndex === dragOverIndex) {
			return sortedLists
		}
		const newOrder = [...currentOrder]
		newOrder.splice(draggedIndex, 1)
		newOrder.splice(dragOverIndex, 0, draggedId)
		return newOrder.map(id => sortedLists.find(l => l.id === id)).filter(Boolean) as typeof sortedLists
	})

	function handleDragStart(e: DragEvent, listId: string) {
		draggedId = listId
		const dt = e.dataTransfer
		if (dt) {
			dt.setData('text/plain', listId)
			dt.effectAllowed = 'move'
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault()
		dragOverIndex = index
	}

	function handleDragLeave() {
		dragOverIndex = null
	}

	async function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault()
		
		if (draggedId === null) {
			draggedId = null
			dragOverIndex = null
			return
		}

		const draggedIndex = currentOrder.indexOf(draggedId)
		
		if (draggedIndex === -1 || draggedIndex === dropIndex) {
			draggedId = null
			dragOverIndex = null
			return
		}

		// Build new order
		const newOrder = [...currentOrder]
		newOrder.splice(draggedIndex, 1)
		newOrder.splice(dropIndex, 0, draggedId)

		// Update all lists with new sort orders in the database
		for (let i = 0; i < sortedLists.length; i++) {
			const list = sortedLists[i]
			const newIndex = newOrder.indexOf(list.id)
			
			const currentSortOrder = list.user_sort_order || {}
			const updatedSortOrder = { ...currentSortOrder, [userId]: newIndex }
			
			await db.lists.update(list.id, {
				user_sort_order: updatedSortOrder,
				sync_status: list.sync_status === 'created' ? 'created' : 'updated',
				updated: new Date().toISOString()
			})
		}

		// Trigger sync in background
		triggerSync()

		// Reset drag state
		draggedId = null
		dragOverIndex = null
	}

	function handleDragEnd() {
		draggedId = null
		dragOverIndex = null
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
        
        <div class="lists-container">
          {#each displayLists as list, index (list.id)}
            <div 
              class="draggable-list" 
              class:dragging={draggedId === list.id}
              class:drag-over={dragOverIndex === index}
              draggable="true"
              ondragstart={(e) => handleDragStart(e, list.id)}
              ondragover={(e) => handleDragOver(e, index)}
              ondragleave={handleDragLeave}
              ondrop={(e) => handleDrop(e, index)}
              ondragend={handleDragEnd}
            >
              <div class="drag-handle">
                <wa-icon name="grip-vertical" class="drag-icon"></wa-icon>
              </div>
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
            </div>
          {/each}
        </div>
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

.lists-container {
  position: relative;
  width: 100%;
}

.draggable-list {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--wa-space-s);
  cursor: grab;
  transition: all 0.15s ease;
  position: relative;
  z-index: 1;
  margin-bottom: 4px;
}

.draggable-list:active {
  cursor: grabbing;
}

.draggable-list.dragging {
  opacity: 0.5;
  z-index: 100;
  transform: scale(1.02);
}

.draggable-list.drag-over {
  border-top: 2px solid var(--wa-color-brand-50);
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 48px;
  cursor: grab;
  color: var(--wa-color-neutral-50);
  flex-shrink: 0;
  transition: color 0.2s ease, background-color 0.2s ease;
  border-radius: var(--wa-border-radius-s);
  -webkit-user-select: none;
  user-select: none;
}

.drag-handle:hover {
  color: var(--wa-color-brand-50);
  background-color: var(--wa-color-neutral-10);
}

.draggable-list:hover .drag-handle {
  color: var(--wa-color-brand-50);
  background-color: var(--wa-color-neutral-10);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-icon {
  font-size: var(--wa-font-size-m);
  pointer-events: none;
}

.card {
  display: flex;
  flex: 1;
  text-decoration: none;
  justify-content: space-between;
  font-weight: 700;
  font-size: var(--wa-font-size-xl);
}

.card wa-card {
  width: 100%;
}

.card wa-card::part(body) {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

:global(.wa-dark) .drag-handle:hover {
  background-color: var(--wa-color-neutral-20);
}

:global(.wa-dark) .draggable-list:hover .drag-handle {
  background-color: var(--wa-color-neutral-20);
}
</style>
