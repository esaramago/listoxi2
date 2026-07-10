<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { db, generatePocketBaseId } from '@/lib/db'
	import { triggerSync } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'

	const listId = $page.params.listId || ''

	let name = $state('')
	let quantity = $state(1)
	let details = $state('')
	let loading = $state(false)
	let errorMsg = $state('')

	async function handleSave(e: SubmitEvent) {
		e.preventDefault()
		const itemName = name.trim()
		if (!itemName) return

		if (quantity < 1) {
			errorMsg = 'A quantidade mínima é 1.'
			return
		}

		loading = true
		errorMsg = ''

		try {
			const itemId = generatePocketBaseId()
			await db.items.put({
				id: itemId,
				list: listId,
				name: itemName,
				quantity: quantity,
				details: details.trim(),
				bought: false,
				sync_status: 'created',
				updated: new Date().toISOString(),
				created: new Date().toISOString()
			})

			triggerSync()
			goto(`/lists/${listId}`)
		} catch (err: any) {
			console.error(err)
			errorMsg = err.message || 'Erro ao adicionar o produto. Tente novamente.'
		} finally {
			loading = false
		}
	}
</script>

<div class="container">
	<Header
		backHref="/lists/{listId}"
		title="Adicionar Produto"
		subtitle="Indique o nome, quantidade e detalhes do produto"
	/>

	<Grid direction="column" gap="m">
		{#if errorMsg}
			<wa-callout variant="danger" class="error-callout">
				<wa-icon slot="icon" name="circle" class="icon-danger"></wa-icon>
				{errorMsg}
			</wa-callout>
		{/if}

		<form onsubmit={handleSave}>
			<Grid direction="column" gap="m">
				<wa-input
					id="item-name"
					label="Nome do Produto"
					type="text"
					placeholder="Ex: Leite, Pão, Maçãs..."
					value={name}
					oninput={(e: any) => name = e.target.value}
					required
				></wa-input>

				<wa-input
					id="item-qty"
					label="Quantidade"
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

				<Grid gap="m" justify="end">
					<wa-button  href="/lists/{listId}">
						Cancelar
					</wa-button>
					<wa-button type="submit" variant="brand" loading={loading ? true : undefined}>
						Adicionar Produto
					</wa-button>
				</Grid>
			</Grid>
		</form>
	</Grid>
</div>

<style>
	.error-callout {
		margin-bottom: var(--wa-space-m);
	}
	.icon-danger {
		color: var(--wa-color-danger-50);
	}
</style>
