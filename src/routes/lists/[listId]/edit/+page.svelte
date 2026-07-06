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

	const listId = $page.params.listId || ''

	interface SharedMember {
		id?: string
		email: string
		isPending: boolean
	}

	let listName = $state('')
	let selectedEmoji = $state('')
	let emailInput = $state('')
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
			
			const pending = ($listData.shared_emails || []).map(email => ({
				email,
				isPending: true
			}))
			sharedMembers = [...pending]

			const resolvedIds = $listData.shared_with || []
			if (resolvedIds.length > 0) {
				Promise.all(
					resolvedIds.map(async (id) => {
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
					const resolvedEmails = resolvedMembers.map(m => m.email)
					const uniquePending = pending.filter(p => !resolvedEmails.includes(p.email))
					sharedMembers = [...uniquePending, ...resolvedMembers]
				})
			}
			
			listLoaded = true
		}
	})

	function addEmail(e: Event) {
		e.preventDefault()
		const email = emailInput.trim().toLowerCase()
		if (!email) return

		if (!email.includes('@')) {
			errorMsg = 'Introduza um email válido.'
			return
		}

		if (sharedMembers.some(m => m.email === email)) {
			errorMsg = 'Este email já foi adicionado.'
			return
		}

		sharedMembers.push({
			email,
			isPending: true
		})
		emailInput = ''
		errorMsg = ''
	}

	function removeMember(member: SharedMember) {
		sharedMembers = sharedMembers.filter(m => m.email !== member.email)
	}

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

					<Grid direction="column" gap="s">
						<Grid align="end" gap="s">
							<wa-input
								id="share-email"
								label="Partilhar com (Email)"
								help-text="Os utilizadores serão convidados se ainda não estiverem registados."
								type="email"
								placeholder="amigo@email.com"
								value={emailInput}
								oninput={(e: any) => emailInput = e.target.value}
								onkeydown={(e: any) => e.key === 'Enter' && (e.preventDefault(), addEmail(e))}
								class="input-grow"
							></wa-input>
							<wa-button onclick={addEmail} class="btn-add-email">
								<wa-icon slot="prefix" name="plus"></wa-icon>
								Adicionar
							</wa-button>
						</Grid>

						{#if sharedMembers.length > 0}
							<div class="shared-emails-container">
								<span class="shared-title">Membros Partilhados / Convidados</span>
								<ul class="shared-list">
									{#each sharedMembers as member}
										<li class="shared-item">
											<span class="shared-user">
												👤 {member.email}
												{#if member.isPending}
													<span class="pending-badge">Pendente</span>
												{/if}
											</span>
											<button type="button" onclick={() => removeMember(member)} class="btn-remove-email" title="Remover partilha">
												&times;
											</button>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</Grid>

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
	:global(.input-grow) {
		flex-grow: 1;
	}
	.loading-state {
		text-align: center;
		padding: var(--wa-space-2xl);
		color: var(--wa-color-neutral-60);
	}
	.shared-emails-container {
		background: rgba(148, 163, 184, 0.03);
		padding: var(--wa-space-s) var(--wa-space-m);
		border-radius: var(--wa-border-radius-m);
		border: 1px solid var(--wa-color-neutral-30);
	}
	.shared-title {
		font-size: var(--wa-font-size-xs);
		font-weight: 700;
		color: var(--wa-color-neutral-60);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.shared-list {
		margin: var(--wa-space-2xs) 0 0 0;
		padding: 0;
		list-style: none;
	}
	.shared-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--wa-space-2xs) 0;
		border-bottom: 1px solid var(--wa-color-neutral-20);
		font-size: var(--wa-font-size-s);
	}
	.shared-user {
		display: flex;
		align-items: center;
		gap: var(--wa-space-xs);
		color: var(--wa-color-neutral-90);
	}
	.pending-badge {
		font-size: var(--wa-font-size-2xs);
		background-color: var(--wa-color-neutral-30);
		color: var(--wa-color-neutral-70);
		padding: var(--wa-space-3xs) var(--wa-space-2xs);
		border-radius: var(--wa-border-radius-s);
		font-weight: 600;
		text-transform: uppercase;
		margin-left: var(--wa-space-xs);
		display: inline-flex;
		align-items: center;
	}
	.btn-remove-email {
		background: none;
		border: none;
		color: var(--wa-color-danger-60);
		cursor: pointer;
		padding: var(--wa-space-3xs) var(--wa-space-xs);
		font-size: var(--wa-font-size-l);
		font-weight: bold;
	}
	.btn-remove-email:hover {
		color: var(--wa-color-danger-50);
	}
</style>
