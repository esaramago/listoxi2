<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { liveQuery } from 'dexie'
	import { db } from '@/lib/db'
	import { triggerSync } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'

	const listId = $page.params.listId || ''
	const itemId = $page.params.itemId || ''

	let name = $state('')
	let quantity = $state(1)
	let details = $state('')
	let bought = $state(false)
	let loading = $state(false)
	let errorMsg = $state('')

	const itemQuery = liveQuery(() => db.items.get(itemId))

	$effect(() => {
		const item = $itemQuery;
		if (item) {
			name = item.name;
			quantity = item.quantity;
			details = item.details;
			bought = item.bought;
		}
	});

	async function handleSave(e: SubmitEvent) {
		e.preventDefault();
		const itemName = name.trim();
		if (!itemName) return;

		if (quantity < 1) {
			errorMsg = 'A quantidade mínima é 1.';
			return;
		}

		loading = true;
		errorMsg = '';

		try {
			const currentItem = await db.items.get(itemId);
			if (currentItem) {
				await db.items.update(itemId, {
					name: itemName,
					quantity: quantity,
					details: details.trim(),
					sync_status: currentItem.sync_status === 'created' ? 'created' : 'updated',
					updated: new Date().toISOString()
				});
				
				triggerSync();
				goto(`/lists/${listId}`);
			} else {
				errorMsg = 'Produto não encontrado.';
			}
		} catch (err: any) {
			console.error(err);
			errorMsg = err.message || 'Erro ao guardar alterações. Tente novamente.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<Header
		backHref="/lists/{listId}"
		title="Editar Produto"
		subtitle="Modifique os dados do produto"
	/>

	<Grid direction="column" gap="m">
		{#if errorMsg}
			<wa-callout variant="danger" class="error-callout">
				<wa-icon slot="icon" name="circle" class="icon-danger"></wa-icon>
				{errorMsg}
			</wa-callout>
		{/if}

		{#if !$itemQuery}
			<div class="loading-state">
				A carregar produto...
			</div>
		{:else}
			<form onsubmit={handleSave}>
				<Grid direction="column" gap="m">
					<wa-input
						id="item-name"
						label="Nome do Produto *"
						type="text"
						value={name}
						oninput={(e: any) => name = e.target.value}
						required
					></wa-input>

					<wa-input
						id="item-qty"
						label="Quantidade *"
						type="number"
						min="1"
						value={quantity.toString()}
						oninput={(e: any) => quantity = parseInt(e.target.value) || 1}
						required
					></wa-input>

					<wa-textarea
						id="item-details"
						label="Detalhes / Observações"
						value={details}
						oninput={(e: any) => details = e.target.value}
						rows="3"
					></wa-textarea>

					<Grid gap="m" justify="end">
						<wa-button  href="/lists/{listId}">
							Cancelar
						</wa-button>
						<wa-button type="submit" variant="brand" loading={loading ? true : undefined}>
							Guardar Alterações
						</wa-button>
					</Grid>
				</Grid>
			</form>
		{/if}
	</Grid>
</div>

<style>

	.error-callout {
		margin-bottom: var(--wa-space-m);
	}
	.icon-danger {
		color: var(--wa-color-danger-50);
	}
	.loading-state {
		text-align: center;
		padding: var(--wa-space-2xl);
		color: var(--wa-color-neutral-60);
	}
</style>
