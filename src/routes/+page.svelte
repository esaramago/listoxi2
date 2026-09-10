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
	let draggedIndex = $state<number | null>(null)
	let dragOverIndex = $state<number | null>(null)

	// Reorder lists during drag for immediate visual feedback
	const displayLists = $derived.by(() => {
		if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
			return sortedLists
		}
		
		const newLists = [...sortedLists]
		const [draggedItem] = newLists.splice(draggedIndex, 1)
		newLists.splice(dragOverIndex, 0, draggedItem)
		return newLists
	})

	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index
		const dt = e.dataTransfer
		if (dt) {
			dt.setData('text/plain', index.toString())
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
		if (draggedIndex === null || draggedIndex === dropIndex) {
			draggedIndex = null
			dragOverIndex = null
			return
		}

		// Update all lists with new sort orders in the database
		for (let i = 0; i < sortedLists.length; i++) {
			const list = sortedLists[i]
			let newIndex: number
			
			if (i === draggedIndex) {
				newIndex = dropIndex
			} else if (i === dropIndex) {
				newIndex = draggedIndex
			} else if (draggedIndex < dropIndex) {
				// Items between draggedIndex and dropIndex move down
				if (i > draggedIndex && i <= dropIndex) {
					newIndex = i - 1
				} else {
					newIndex = i
				}
			} else {
				// Items between dropIndex and draggedIndex move up
				if (i >= dropIndex && i < draggedIndex) {
					newIndex = i + 1
				} else {
					newIndex = i
				}
			}
			
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
		draggedIndex = null
		dragOverIndex = null
	}

	function handleDragEnd() {
		draggedIndex = null
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
              class:dragging={draggedIndex === index}
              class:drag-over={dragOverIndex === index}
              draggable="true"
              ondragstart={(e) => handleDragStart(e, sortedLists.findIndex(l => l.id === list.id))}
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
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}

.draggable-list:active {
  cursor: grabbing;
}

.draggable-list.dragging {
  opacity: 0.5;
  z-index: 100;
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
  transition: color 0.2s ease;
}

.drag-handle:hover {
  color: var(--wa-color-brand-50);
}

.draggable-list:hover .drag-handle {
  color: var(--wa-color-brand-50);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-icon {
  font-size: var(--wa-font-size-m);
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
