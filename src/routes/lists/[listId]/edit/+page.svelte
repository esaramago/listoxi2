<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { liveQuery } from 'dexie'
	import { db } from '@/lib/db'
	import { pb, inviteUserByEmail } from '@/lib/pb'
	import { triggerSync, isOnline } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'
	import EmojiPicker from '@/components/EmojiPicker.svelte'
	import ListSharing, { type SharedMember } from '@/components/ListSharing.svelte'

	const listId = $page.params.listId || ''

	let listName = $state('')
	let selectedEmoji = $state('')
	let sharedMembers = $state<SharedMember[]>([])
	let loading = $state(false)
	let errorMsg = $state('')
	let listLoaded = $state(false)

	// Fetch original data
	const listData = liveQuery(() => db.lists.get(listId))

	$effect(() => {
		if ($listData && !listLoaded) {
			listName = $listData.name
			selectedEmoji = $listData.emoji || ''
			
			const pending = ($listData.shared_emails || []).map((email: string) => ({
				email,
				isPending: true
			}))
			sharedMembers = [...pending]

			const resolvedIds = $listData.shared_with || []
			if (resolvedIds.length > 0) {
				Promise.all(
					resolvedIds.map(async (id: string) => {
						try {
							const userRecord = await pb.collection('users').getOne(id)
							return {
								id,
								email: userRecord.email || userRecord.username || id,
								isPending: false
							}
						} catch (e) {
							return {
								id,
								email: id,
								isPending: false
							}
						}
					})
				).then((resolvedMembers) => {
					const resolvedEmails = resolvedMembers.map((m: any) => m.email)
					const uniquePending = pending.filter((p: any) => !resolvedEmails.includes(p.email))
					sharedMembers = [...uniquePending, ...resolvedMembers]
				})
			}
			
			listLoaded = true
		}
	})

	async function handleUpdate(e: SubmitEvent) {
		e.preventDefault()
		const name = listName.trim()
		if (!name) return

		loading = true
		errorMsg = ''

		try {
			const currentList = await db.lists.get(listId)
			if (!currentList) {
				throw new Error('Lista não encontrada.')
			}

			// Membros resolvidos que o utilizador manteve
			const keptUserIds = sharedMembers
				.filter(m => !m.isPending && m.id)
				.map(m => m.id as string)

			// Emails pendentes que o utilizador manteve ou adicionou
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
				...currentList,
				name: name,
				emoji: selectedEmoji,
				shared_with: sharedWithUserIds,
				shared_emails: pendingEmails,
				sync_status: currentList.sync_status === 'created' ? 'created' : 'updated',
				updated: new Date().toISOString()
			})

			triggerSync()
			goto(`/lists/${listId}`)
		} catch (err: any) {
			console.error(err)
			errorMsg = err.message || 'Erro ao guardar alterações. Tente novamente.'
		} finally {
			loading = false
		}
	}
</script>

<div class="container">
	<Header backHref="/lists/{listId}" title="Editar Lista" subtitle="Altera o nome, emoji ou partilha da lista" />

	{#if !$listData}
		<div class="loading-state">A carregar detalhes da lista...</div>
	{:else}
		<Grid direction="column" gap="m">
			{#if errorMsg}
				<wa-callout variant="danger" class="error-callout">
					<wa-icon slot="icon" name="circle" class="icon-danger"></wa-icon>
					{errorMsg}
				</wa-callout>
			{/if}

			<form onsubmit={handleUpdate}>
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

					<EmojiPicker label="Ícone da Lista" bind:value={selectedEmoji} />

					<ListSharing bind:sharedMembers />

					<Grid gap="m" justify="end">
						<wa-button href="/lists/{listId}">
							Cancelar
						</wa-button>
						<wa-button type="submit" variant="brand" loading={loading ? true : undefined}>
							Guardar Alterações
						</wa-button>
					</Grid>
				</Grid>
			</form>
		</Grid>
	{/if}
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
