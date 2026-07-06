<script lang="ts">
	import { goto } from '$app/navigation'
	import { db, generatePocketBaseId } from '@/lib/db'
	import { pb, inviteUserByEmail } from '@/lib/pb'
	import { triggerSync, isOnline } from '@/lib/sync'
	import Grid from '@/components/ui/Grid.svelte'
	import Header from '@/components/Header.svelte'
	import EmojiPicker from '@/components/EmojiPicker.svelte'

	let listName = $state('')
	let selectedEmoji = $state('')
	let emailInput = $state('')
	let sharedEmails = $state<string[]>([])
	let loading = $state(false)
	let errorMsg = $state('')

	function addEmail(e: Event) {
		e.preventDefault()
		const email = emailInput.trim().toLowerCase()
		if (!email) return

		if (!email.includes('@')) {
			errorMsg = 'Introduza um email válido.'
			return
		}

		if (sharedEmails.includes(email)) {
			errorMsg = 'Este email já foi adicionado.'
			return
		}

		sharedEmails.push(email)
		emailInput = ''
		errorMsg = ''
	}

	function removeEmail(index: number) {
		sharedEmails.splice(index, 1)
	}

	async function handleSave(e: SubmitEvent) {
		e.preventDefault()
		const name = listName.trim()
		if (!name) return

		loading = true
		errorMsg = ''

		try {
			const listId = generatePocketBaseId()
			const ownerId = pb.authStore.model?.id || ''

			let sharedWithUserIds: string[] = []
			let pendingEmails: string[] = []

			const online = $isOnline

			if (online) {
				for (const email of sharedEmails) {
					try {
						const userId = await inviteUserByEmail(email)
						sharedWithUserIds.push(userId)
					} catch (err) {
						console.error(`Error resolving email ${email}, queuing offline:`, err)
						pendingEmails.push(email)
					}
				}
			} else {
				pendingEmails = [...sharedEmails]
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
					label="Nome da Lista *"
					type="text"
					placeholder="Ex: Supermercado, Casa..."
					value={listName}
					oninput={(e: any) => listName = e.target.value}
					required
				></wa-input>

				<EmojiPicker label="Emoji da Lista" bind:value={selectedEmoji} />

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
            <wa-button  onclick={addEmail} class="btn-add-email">
              <wa-icon slot="prefix" name="plus"></wa-icon>
              Adicionar
            </wa-button>
          </Grid>

          {#if sharedEmails.length > 0}
            <div class="shared-emails-container">
              <span class="shared-title">Emails Adicionados</span>
              <ul class="shared-list">
                {#each sharedEmails as email, idx}
                  <li class="shared-item">
                    <span class="shared-user">
                      👤 {email}
                    </span>
                    <button type="button" onclick={() => removeEmail(idx)} class="btn-remove-email">
                      &times;
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </Grid>

				<Grid gap="m" justify="end">
					<wa-button  href="/">
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
	:global(.input-grow) {
		flex-grow: 1;
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
