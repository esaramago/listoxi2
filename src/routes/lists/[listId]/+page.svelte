<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { liveQuery } from 'dexie';
	import { db } from '@/lib/db';
	import { triggerSync } from '@/lib/sync';
	import Icon from '@/lib/components/Icon.svelte';
	import Grid from '@/components/ui/Grid.svelte';

	const listId = $page.params.listId || '';

	// Reactive query for the list details
	const list = liveQuery(() => db.lists.get(listId));

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
	<!-- Top Navigation and Header -->
	<header class="header">
		<div class="header-title-container">
			<a href="/" class="back-link">
				&larr; Voltar
			</a>
			{#if !$list}
				<h1 class="header-title">A carregar lista...</h1>
			{:else}
				<Grid tag="h1" align="center" gap="xs" class="header-title">
					<span>
						{#if $list.name.toLowerCase().includes('casa') || $list.name.toLowerCase().includes('padrões') || $list.name.toLowerCase().includes('louriceira')}
							🏡
						{:else}
							🍏
						{/if}
					</span>
					<span>Lista de compras de {$list.name}</span>
				</Grid>
				<p class="header-subtitle">
					<span>{$openItems ? $openItems.length : 0} produtos em falta</span>
				</p>
			{/if}
		</div>

		<!-- Action buttons for the list -->
		<div class="action-buttons">
			{#if $list}
				<wa-button variant="text" onclick={deleteList} title="Apagar Lista" class="btn-delete-list">
					<Icon slot="prefix" name="trash" />
					Apagar
				</wa-button>
			{/if}
		</div>
	</header>

	{#if $list}
		<!-- Action line with "Adicionar" button -->
		<Grid justify="end" class="action-line">
			<wa-button variant="neutral" pill href="/lists/{listId}/create" class="btn-add-product">
				<Icon slot="prefix" name="plus" />
				Adicionar Produto
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
					<div class="product-card">
						<div class="product-card-left" onclick={() => goto(`/lists/${listId}/items/${item.id}`)} role="link" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/lists/${listId}/items/${item.id}`)}>
							<button class="check-btn" onclick={(e) => { e.stopPropagation(); toggleBought(item); }} title="Marcar como comprado">
								<Icon name="circle" class="check-icon" />
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
								<Icon name="trash" class="delete-icon" />
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Collapsible Bought Items -->
		<div class="bought-section">
			<div class="section-title" onclick={() => showBought = !showBought} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (showBought = !showBought)}>
				<Icon name={showBought ? 'chevron-up' : 'chevron-down'} class="chevron-icon" />
				<span>Concluídos ({showBought && boughtItemsData ? boughtItemsData.length : 'clique para ver'})</span>
			</div>

			{#if showBought}
				<div class="bought-list">
					{#if boughtItemsData.length === 0}
						<div class="empty-bought-msg">
							Nenhum produto concluído nesta lista.
						</div>
					{:else}
						{#each boughtItemsData as item (item.id)}
							<div class="product-card bought">
								<div class="product-card-left" onclick={() => goto(`/lists/${listId}/items/${item.id}`)} role="link" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/lists/${listId}/items/${item.id}`)}>
									<button class="check-btn check-btn-bought" onclick={(e) => { e.stopPropagation(); toggleBought(item); }} title="Marcar como pendente">
										<Icon name="check-circle" class="check-icon" />
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
										<Icon name="trash" class="delete-icon" />
									</button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.header {
		margin-bottom: var(--wa-space-l);
	}
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--wa-space-3xs);
		color: var(--wa-color-brand-50);
		text-decoration: none;
		font-size: var(--wa-font-size-s);
		font-weight: 700;
		margin-bottom: var(--wa-space-2xs);
	}
	.back-link:hover {
		color: var(--wa-color-brand-40);
	}
	:global(.header-title.l-grid) {
		display: inline-flex;
		margin: 0;
	}
	.btn-delete-list {
		color: var(--wa-color-danger-60);
	}
	.btn-delete-list:hover {
		color: var(--wa-color-danger-50);
	}
	:global(.action-line) {
		margin-bottom: var(--wa-space-m);
	}
	.btn-add-product {
		--wa-button-padding: var(--wa-space-xs) var(--wa-space-m);
	}
	.loading-products {
		text-align: center;
		padding: var(--wa-space-m);
		color: var(--wa-color-neutral-60);
	}
	.empty-products {
		text-align: center;
		padding: var(--wa-space-xl) var(--wa-space-m);
		background: rgba(148, 163, 184, 0.02);
		border: 1px dashed var(--wa-color-neutral-30);
		border-radius: var(--wa-border-radius-m);
		color: var(--wa-color-neutral-60);
	}
	.check-icon {
		width: var(--wa-space-l);
		height: var(--wa-space-l);
	}
	.item-text-container {
		display: flex;
		flex-direction: column;
		gap: var(--wa-space-3xs);
	}
	.item-details {
		font-size: var(--wa-font-size-xs);
		color: var(--wa-color-neutral-60);
	}
	.delete-icon {
		width: var(--wa-space-m);
		height: var(--wa-space-m);
	}
	.bought-section {
		margin-top: var(--wa-space-2xl);
	}
	.chevron-icon {
		width: var(--wa-space-s);
		height: var(--wa-space-s);
		color: var(--wa-color-neutral-60);
	}
	.bought-list {
		margin-top: var(--wa-space-xs);
	}
	.empty-bought-msg {
		text-align: center;
		padding: var(--wa-space-m);
		color: var(--wa-color-neutral-60);
		font-size: var(--wa-font-size-s);
	}
	.check-btn-bought {
		color: var(--wa-color-success-50);
	}
</style>
