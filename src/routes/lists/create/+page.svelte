<script lang="ts">
	import { goto } from '$app/navigation'
	import { db, generatePocketBaseId } from '@/lib/db'
	import { pb, inviteUserByEmail } from '@/lib/pb'
	import { triggerSync, isOnline } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'
	import EmojiPicker from '@/components/EmojiPicker.svelte'
	import ListSharing, { type SharedMember } from '@/components/ListSharing.svelte'

	let listName = $state('')
	let selectedEmoji = $state('')
	let sharedMembers = $state<SharedMember[]>([])
	let loading = $state(false)
	let errorMsg = $state('')

	async function handleSave(e: SubmitEvent) {
		e.preventDefault()
		const name = listName.trim()
		if (!name) return

		loading = true
		errorMsg = ''

		try {
			const listId = generatePocketBaseId()
			const ownerId = pb.authStore.model?.id || ''

			// Membros resolvidos que o utilizador adicionou (se já forem registados)
			const keptUserIds = sharedMembers
				.filter(m => !m.isPending && m.id)
				.map(m => m.id as string)

			// Emails de utilizadores que necessitam de convite
			const currentPendingEmails = sharedMembers
				.filter(m => m.isPending)
				.map(m => m.email)

			let sharedWithUserIds = [...keptUserIds]
			let pendingEmails: string[] = []

			const online = $isOnline

			if (online && currentPendingEmails.length > 0) {
				for (const email of currentPendingEmails) {
					try {
						const userId = await inviteUserByEmail(email)
						if (!sharedWithUserIds.includes(userId)) {
							sharedWithUserIds.push(userId)
						}
					} catch (err: any) {
						// Se for um erro do servidor permanente (como 400 ou 403) ou erro de perfil privado,
						// mostramos o erro diretamente ao utilizador em vez de ignorar e guardar offline.
						if (err.status === 400 || err.status === 403 || (err instanceof Error && !err.message.includes('fetch') && !err.message.includes('network'))) {
							throw err
						}
						console.error(`Error resolving email ${email}, queuing offline:`, err)
						pendingEmails.push(email)
					}
				}
			} else {
				pendingEmails = [...currentPendingEmails]
			}

			await db.lists.put({
				id: listId,
				name: name,
				owner: ownerId,
				shared_with: sharedWithUserIds,
				shared_emails: pendingEmails,
				sync_status: 'created',
				updated: new Date().toISOString(),
				emoji: selectedEmoji
			})

			triggerSync()
			goto('/')
		} catch (err: any) {
			console.error(err)
			errorMsg = err.message || 'Erro ao criar a lista. Tente novamente.'
		} finally {
			loading = false
		}
	}
</script>

<div class="container">
	<Header title="Criar Nova Lista" subtitle="Defina o nome da sua lista de compras" />

	<Grid direction="column" gap="m">
		{#if errorMsg}
			<wa-callout variant="danger" class="error-callout">
				<wa-icon slot="icon" name="circle" class="icon-danger"></wa-icon>
				{errorMsg}
			</wa-callout>
		{/if}

		<form onsubmit={handleSave}>
			<Grid direction="column" gap="xl">
				<wa-input
					id="list-name"
					label="Nome da Lista"
					type="text"
					placeholder="Ex: Supermercado, Casa..."
					value={listName}
					oninput={(e: any) => listName = e.target.value}
					required
				></wa-input>

				<EmojiPicker label="Emoji da Lista" bind:value={selectedEmoji} />

				<ListSharing bind:sharedMembers />

				<Grid gap="m" justify="end">
					<wa-button href="/">
						Cancelar
					</wa-button>
					<wa-button type="submit" variant="brand" loading={loading ? true : undefined}>
						Guardar Lista
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
