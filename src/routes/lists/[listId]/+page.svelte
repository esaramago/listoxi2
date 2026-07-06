<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { liveQuery } from 'dexie'
	import { db } from '@/lib/db'
	import { triggerSync } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'

	const listId = $page.params.listId || ''

	// Reactive query for the list details
	const list = liveQuery(() => db.lists.get(listId))

	// Reactive query for open items
	const openItems = liveQuery(() =>
		db.items
			.where('list')
			.equals(listId)
			.and((item) => !item.bought && item.sync_status !== 'deleted')
			.toArray()
	);

	// Collapsible bought items state
	let showBought = $state(false);
	let boughtItemsData = $state<any[]>([]);

	// Only subscribe/load bought items when the section is opened
	$effect(() => {
		if (showBought) {
			const sub = liveQuery(() =>
				db.items
					.where('list')
					.equals(listId)
					.and((item) => item.bought && item.sync_status !== 'deleted')
					.toArray()
			).subscribe((data) => {
				boughtItemsData = data;
			});
			return () => sub.unsubscribe();
		} else {
			boughtItemsData = [];
		}
	});

	async function toggleBought(item: any) {
		await db.items.update(item.id, {
			bought: !item.bought,
			sync_status: item.sync_status === 'created' ? 'created' : 'updated',
			updated: new Date().toISOString()
		});
		triggerSync();
	}

	async function deleteItem(item: any) {
		if (item.sync_status === 'created') {
			await db.items.delete(item.id);
		} else {
			await db.items.update(item.id, {
				sync_status: 'deleted',
				updated: new Date().toISOString()
			});
		}
		triggerSync();
	}

	async function deleteList() {
		if (confirm('Tem a certeza que deseja apagar esta lista e todos os seus produtos?')) {
			const currentList = await db.lists.get(listId);
			if (currentList) {
				if (currentList.sync_status === 'created') {
					await db.lists.delete(listId);
					await db.items.where('list').equals(listId).delete();
				} else {
					await db.lists.update(listId, {
						sync_status: 'deleted',
						updated: new Date().toISOString()
					});
					// Soft delete all items in this list
					const itemsInList = await db.items.where('list').equals(listId).toArray();
					for (const item of itemsInList) {
						if (item.sync_status === 'created') {
							await db.items.delete(item.id);
						} else {
							await db.items.update(item.id, {
								sync_status: 'deleted',
								updated: new Date().toISOString()
							});
						}
					}
				}
				triggerSync();
				goto('/');
			}
		}
	}
</script>

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
		{#snippet actions()}
			{#if $list}
				<wa-button variant="text" href="/lists/{listId}/edit" title="Editar Lista" class="btn-edit-list">
					<wa-icon slot="prefix" name="pen"></wa-icon>
					Editar
				</wa-button>
				<wa-button variant="text" onclick={deleteList} title="Apagar Lista" class="btn-delete-list">
					<wa-icon slot="prefix" name="trash"></wa-icon>
					Apagar
				</wa-button>
			{/if}
		{/snippet}
	</Header>

	{#if $list}
		<!-- Action line with "Adicionar" button -->
		<Grid justify="space-between">
			{#if $list}
				<p>{$openItems ? $openItems.length : 0} produtos</p>
			{/if}
			<wa-button href="/lists/{listId}/create" appearance="plain" variant="brand">
        <wa-icon name="plus"></wa-icon>
				Adicionar produto
			</wa-button>
		</Grid>

		<!-- Open Items -->
		<div class="items-list">
			{#if !$openItems}
				<div class="loading-products">
					A carregar produtos...
				</div>
			{:else if $openItems.length === 0}
				<div class="empty-products">
					Nenhum produto em falta.
				</div>
			{:else}
				{#each $openItems as item (item.id)}
					<wa-card class="card">
            <button onclick={(e) => { e.stopPropagation(); toggleBought(item); }} title="Marcar como comprado">
              <wa-icon name="circle" class="check-icon"></wa-icon>
            </button>
						<button class="card__link" onclick={() => goto(`/lists/${listId}/items/${item.id}`)} role="link" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/lists/${listId}/items/${item.id}`)}>
							<div>
                {item.quantity}
								<span class="product-name">{item.name}</span>
								{#if item.details}
									<span class="item-details">{item.details}</span>
								{/if}
							</div>
						</button>
						<div>
							<button onclick={() => deleteItem(item)} title="Apagar produto">
								<wa-icon name="trash" class="delete-icon"></wa-icon>
							</button>
						</div>
					</wa-card>
				{/each}
			{/if}
		</div>

		<!-- Collapsible Bought Items -->
		<div class="bought-section">
			<div class="section-title" onclick={() => showBought = !showBought} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showBought = !showBought)}>
				<wa-icon name={showBought ? 'chevron-up' : 'chevron-down'} class="chevron-icon"></wa-icon>
				<span>Concluídos ({showBought && boughtItemsData ? `${boughtItemsData.length} itens` : ''})</span>
			</div>

			{#if showBought}
				<div class="bought-list">
					{#if boughtItemsData.length === 0}
						<div class="empty-bought-msg">
							Nenhum produto concluído nesta lista.
						</div>
					{:else}
						{#each boughtItemsData as item (item.id)}
							<wa-card class="product-card bought">
								<div class="product-card-left" onclick={() => goto(`/lists/${listId}/items/${item.id}`)} role="link" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/lists/${listId}/items/${item.id}`)}>
									<button class="check-btn check-btn-bought" onclick={(e) => { e.stopPropagation(); toggleBought(item); }} title="Marcar como pendente">
										<wa-icon name="check-circle" class="check-icon"></wa-icon>
									</button>
									<div class="item-text-container">
										<span class="product-name">{item.name}</span>
										{#if item.details}
											<span class="item-details">{item.details}</span>
										{/if}
									</div>
								</div>
								<div class="product-card-right">
									<span class="product-qty">{item.quantity}x</span>
									<button class="delete-btn" onclick={() => deleteItem(item)} title="Apagar produto">
										<wa-icon name="trash" class="delete-icon"></wa-icon>
									</button>
								</div>
							</wa-card>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
 .card {
   &::part(body) {
     display: flex;
     justify-content: space-between;
     align-items: center;
   }
 }
 .card__link {
  flex-grow: 1;
 }
</style>
