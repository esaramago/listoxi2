<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { liveQuery } from 'dexie'
	import { db } from '@/lib/db'
	import { triggerSync } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'
  import ProductCard from '@/components/ProductCard.svelte'
	import { pb } from '@/lib/pb'
	import SyncBadge from '@/components/SyncBadge.svelte'

	const listId = $page.params.listId || ''

	let memberEmails = $state<string[]>([])

	$effect(() => {
		if ($list) {
			const resolvedIds = $list.shared_with || []
			const pending = $list.shared_emails || []
			
			memberEmails = [...pending]

			if (resolvedIds.length > 0) {
				Promise.all(
					resolvedIds.map(async (id: string) => {
						try {
							const userRecord = await pb.collection('users').getOne(id)
							return userRecord.email || userRecord.username || id
						} catch (e) {
							return null
						}
					})
				).then((results) => {
					const resolvedEmails = results.filter((r): r is string => !!r)
					memberEmails = [...pending, ...resolvedEmails]
				})
			}
		} else {
			memberEmails = []
		}
	})

	let shareTooltip = $derived.by(() => {
		if (memberEmails.length === 0) {
			return 'Esta lista está partilhada com outros utilizadores'
		}
		return `Partilhada com: ${memberEmails.join(', ')}`
	})

	let showMembersList = $state(false)

	function handleOutsideClick(event: MouseEvent) {
		if (showMembersList) {
			const container = document.querySelector('.share-badge-container')
			if (container && !container.contains(event.target as Node)) {
				showMembersList = false
			}
		}
	}

	// Reactive query for the list details
	const list = liveQuery(() => db.lists.get(listId))

	// Reactive query for open items
	const openItems = liveQuery(() =>
		db.items
			.where('list')
			.equals(listId)
			.and((item) => !item.bought && item.sync_status !== 'deleted')
			.toArray()
			.then((items) =>
				items.sort((a, b) => {
					const aTime = new Date(a.created || a.updated || 0).getTime()
					const bTime = new Date(b.created || b.updated || 0).getTime()
					return aTime - bTime
				})
			)
	);

	// Collapsible bought items state
	let showBought = $state(false)
	let boughtItemsData = $state<any[]>([])

	// Only subscribe/load bought items when the section is opened
	$effect(() => {
		if (showBought) {
			const sub = liveQuery(() =>
				db.items
					.where('list')
					.equals(listId)
					.and((item) => item.bought && item.sync_status !== 'deleted')
					.toArray()
					.then((items) =>
						items.sort((a, b) => {
							const aTime = new Date(a.created || a.updated || 0).getTime()
							const bTime = new Date(b.created || b.updated || 0).getTime()
							return aTime - bTime
						})
					)
			).subscribe((data) => {
				boughtItemsData = data
			})
			return () => sub.unsubscribe()
		} else {
			boughtItemsData = []
		}
	})

	async function toggleBought(itemId: string) {
		const item = await db.items.get(itemId)
		if (!item) return
    await db.items.update(itemId, {
			bought: !item.bought,
			sync_status: item.sync_status === 'created' ? 'created' : 'updated',
			updated: new Date().toISOString()
		})
		triggerSync()
	}

	async function deleteItem(itemId: string) {
		const item = await db.items.get(itemId)
		if (!item) return
    if (confirm('Tem a certeza que deseja apagar este produto?')) {
      if (item.sync_status === 'created') {
        await db.items.delete(itemId)
      } else {
        await db.items.update(itemId, {
          sync_status: 'deleted',
          updated: new Date().toISOString()
        })
      }
      triggerSync()
    }
	}

	async function deleteList() {
		if (confirm('Tem a certeza que deseja apagar esta lista e todos os seus produtos?')) {
			const currentList = await db.lists.get(listId)
			if (currentList) {
				if (currentList.sync_status === 'created') {
					await db.lists.delete(listId)
					await db.items.where('list').equals(listId).delete()
				} else {
					await db.lists.update(listId, {
						sync_status: 'deleted',
						updated: new Date().toISOString()
					})
					// Soft delete all items in this list
					const itemsInList = await db.items.where('list').equals(listId).toArray()
					for (const item of itemsInList) {
						if (item.sync_status === 'created') {
							await db.items.delete(item.id)
						} else {
							await db.items.update(item.id, {
								sync_status: 'deleted',
								updated: new Date().toISOString()
							})
						}
					}
				}
				triggerSync()
				goto('/')
			}
		}
	}
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="container">
	<Header backHref="/">
		{#snippet titleSnippet()}
			{#if !$list}
				<h1 class="header-title">A carregar lista...</h1>
			{:else}
				<Grid tag="h1" align="center" gap="xs" class="header-title">
					<span>
						{#if $list.emoji}
							{$list.emoji}
						{:else if $list.name.toLowerCase().includes('casa') || $list.name.toLowerCase().includes('padrões') || $list.name.toLowerCase().includes('louriceira')}
							🏡
						{:else if $list.name.toLowerCase().includes('lidl') || $list.name.toLowerCase().includes('continente') || $list.name.toLowerCase().includes('compras')}
							🛒
						{:else}
							🍏
						{/if}
					</span>
					<span>{$list.name}</span>
				</Grid>
			{/if}
		{/snippet}
		{#snippet subtitleSnippet()}
			{#if $list}
				<div class="subtitle-container">
					{#if ($list.shared_with && $list.shared_with.length > 0) || ($list.shared_emails && $list.shared_emails.length > 0)}
						<div class="share-badge-container">
							<button 
								type="button" 
								class="share-badge" 
								onclick={(e) => { e.stopPropagation(); showMembersList = !showMembersList }}
								title={shareTooltip}
							>
								<wa-icon name="user-group"></wa-icon>
								<span>Partilhada</span>
							</button>
							
							{#if showMembersList}
								<div class="share-popover">
									<div class="popover-header">Partilhada com:</div>
									<ul class="popover-list">
										{#if memberEmails.length === 0}
											<li>Lista partilhada ({$list.shared_with.length} {$list.shared_with.length === 1 ? 'pessoa' : 'pessoas'})</li>
										{:else}
											{#each memberEmails as email}
												<li>👤 {email}</li>
											{/each}
										{/if}
									</ul>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		{/snippet}
		{#snippet actions()}
			{#if $list}
				<wa-dropdown-item href="/lists/{listId}/edit">
					<wa-icon slot="icon" name="pen"></wa-icon>
					Editar Lista
				</wa-dropdown-item>
				<wa-dropdown-item onclick={deleteList} variant="danger">
					<wa-icon slot="icon" name="trash"></wa-icon>
					Apagar Lista
				</wa-dropdown-item>
			{/if}
		{/snippet}
	</Header>

	{#if $list}

    <Grid direction="column" gap="l">
      <!-- Action line with "Adicionar" button -->
      <Grid justify="space-between" align="center">
        {#if $list}
          <div>
            <SyncBadge />
            <p>{$openItems ? $openItems.length : 0} produtos</p>
          </div>
        {/if}
        <wa-button href="/lists/{listId}/create" appearance="plain" variant="brand">
          <wa-icon name="plus"></wa-icon>
          Adicionar produto
        </wa-button>
      </Grid>

      <!-- Open Items -->
      {#if !$openItems}
        <div class="loading-products">
          A carregar produtos...
        </div>
      {:else if $openItems.length === 0}
        <div class="empty-products">
          Nenhum produto em falta.
        </div>
      {:else}
        <Grid direction="column" gap="xs">
          {#each $openItems as item (item.id)}
            <ProductCard
              productName={item.name}
              productQuantity={item.quantity}
              productDetails={item.details}
              productId={item.id}
              {listId}
              toggleBought={() => toggleBought(item.id)}
              deleteItem={() => deleteItem(item.id)}
              isBought={item.bought}
            />
          {/each}
        </Grid>
      {/if}

      <!-- Collapsible Bought Items -->
      <div>
        <button onclick={() => showBought = !showBought} onkeydown={(e) => e.key === 'Enter' && (showBought = !showBought)}>
          <wa-icon name={showBought ? 'chevron-up' : 'chevron-down'} class="chevron-icon"></wa-icon>
          <span>Concluídos {showBought && boughtItemsData ? `(${boughtItemsData.length} itens)` : ''}</span>
        </button>

        {#if showBought}
          <div>
            {#if boughtItemsData.length === 0}
              <p>Nenhum produto concluído nesta lista.</p>
            {:else}
              {#each boughtItemsData as item (item.id)}
                <ProductCard
                  productName={item.name}
                  productQuantity={item.quantity}
                  productDetails={item.details}
                  productId={item.id}
                  isBought={item.bought}
                  {listId}
                  toggleBought={() => toggleBought(item.id)}
                  deleteItem={() => deleteItem(item.id)}
                />
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    </Grid>
	{/if}
</div>

<style>
	.subtitle-container {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--wa-space-s);
		margin-top: var(--wa-space-3xs);
	}

	.share-badge-container {
		position: relative;
		display: inline-flex;
	}

	.share-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--wa-space-3xs);
		background-color: var(--wa-color-brand-90);
		color: var(--wa-color-brand-30);
		padding: var(--wa-space-3xs) var(--wa-space-s);
		border-radius: var(--wa-border-radius-pill);
		font-size: var(--wa-font-size-s);
		font-weight: 600;
		border: 1px solid var(--wa-color-brand-80);
		height: 24px;
		box-sizing: border-box;
		cursor: pointer;
		outline: none;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.share-badge:hover, .share-badge:focus {
		background-color: var(--wa-color-brand-80);
		border-color: var(--wa-color-brand-70);
	}

	.share-badge wa-icon {
		font-size: var(--wa-font-size-s);
	}

	.share-popover {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 100;
		background-color: #ffffff;
		border: 1px solid var(--wa-color-neutral-30);
		border-radius: var(--wa-border-radius-m);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: var(--wa-space-s);
		min-width: 200px;
		max-width: 280px;
		text-align: left;
		animation: popoverFadeIn 0.15s ease-out;
	}

	@keyframes popoverFadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.popover-header {
		font-size: var(--wa-font-size-xs);
		color: var(--wa-color-neutral-60);
		margin-bottom: var(--wa-space-3xs);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 700;
	}

	.popover-list {
		margin: 0;
		padding: 0;
		list-style: none;
		max-height: 150px;
		overflow-y: auto;
	}

	.popover-list li {
		font-size: var(--wa-font-size-s);
		color: var(--wa-color-neutral-90);
		padding: var(--wa-space-3xs) 0;
		border-bottom: 1px solid var(--wa-color-neutral-20);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.popover-list li:last-child {
		border-bottom: none;
	}

	:global(.wa-dark) .share-badge {
		background-color: var(--wa-color-brand-10);
		color: var(--wa-color-brand-80);
		border-color: var(--wa-color-brand-20);
	}

	:global(.wa-dark) .share-badge:hover, :global(.wa-dark) .share-badge:focus {
		background-color: var(--wa-color-brand-20);
		border-color: var(--wa-color-brand-30);
	}

	:global(.wa-dark) .share-popover {
		background-color: var(--wa-color-neutral-10);
		border-color: var(--wa-color-neutral-20);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

</style>
