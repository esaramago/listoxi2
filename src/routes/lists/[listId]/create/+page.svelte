<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { db, generatePocketBaseId } from '@/lib/db';
	import { triggerSync } from '@/lib/sync';
	import Icon from '@/lib/components/Icon.svelte';
	import Grid from '@/components/ui/Grid.svelte';

	const listId = $page.params.listId || '';

	let name = $state('');
	let quantity = $state(1);
	let details = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

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
			const itemId = generatePocketBaseId();
			await db.items.put({
				id: itemId,
				list: listId,
				name: itemName,
				quantity: quantity,
				details: details.trim(),
				bought: false,
				sync_status: 'created',
				updated: new Date().toISOString()
			});

			triggerSync();
			goto(`/lists/${listId}`);
		} catch (err: any) {
			console.error(err);
			errorMsg = err.message || 'Erro ao adicionar o produto. Tente novamente.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container">
	<header class="header">
		<div class="header-title-container">
			<a href="/lists/{listId}" class="back-link">
				&larr; Voltar
			</a>
			<h1 class="header-title">Adicionar Produto</h1>
			<p class="header-subtitle">Indique o nome, quantidade e detalhes do produto</p>
		</div>
	</header>

	<Grid direction="column" gap="m">
		{#if errorMsg}
			<wa-callout variant="danger" class="error-callout">
				<Icon slot="icon" name="circle" class="icon-danger" />
				{errorMsg}
			</wa-callout>
		{/if}

		<form onsubmit={handleSave}>
			<Grid direction="column" gap="m">
				<wa-input
					id="item-name"
					label="Nome do Produto *"
					type="text"
					placeholder="Ex: Leite, Pão, Maçãs..."
					value={name}
					oninput={(e: any) => name = e.target.value}
					required
					autofocus
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
					placeholder="Ex: Marca própria, meio-gordo, pacote de 1L..."
					value={details}
					oninput={(e: any) => details = e.target.value}
					rows="3"
				></wa-textarea>

				<Grid gap="m" fullWidth class="button-grid">
					<wa-button type="submit" variant="primary" loading={loading ? true : undefined}>
						Adicionar Produto
					</wa-button>
					<wa-button variant="neutral" href="/lists/{listId}">
						Cancelar
					</wa-button>
				</Grid>
			</Grid>
		</form>
	</Grid>
</div>

<style>
	.header {
		margin-bottom: var(--wa-space-m);
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
	.error-callout {
		margin-bottom: var(--wa-space-m);
	}
	.icon-danger {
		color: var(--wa-color-danger-50);
	}
	:global(.button-grid) {
		margin-top: var(--wa-space-m);
	}
</style>
