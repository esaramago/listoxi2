<script lang="ts" module>
	export interface SharedMember {
		id?: string
		email: string
		isPending: boolean
	}
</script>

<script lang="ts">
	import { pb } from '@/lib/pb'
	import { onMount } from 'svelte'
	import Grid from '@/components/ui/Grid.svelte'

	let { sharedMembers = $bindable([]) }: { sharedMembers: SharedMember[] } = $props()

	let errorMsg = $state('')
	let registeredUsers = $state<any[]>([])

	let availableUsers = $derived(
		registeredUsers.filter((user: any) => 
			!sharedMembers.some((member: SharedMember) => member.email === user.email)
		)
	)

	onMount(async () => {
		try {
			const users = await pb.collection('users').getFullList({
				sort: 'email'
			})
			const currentUserId = pb.authStore.model?.id
			registeredUsers = users.filter((u: any) => u.id !== currentUserId)
		} catch (err: any) {
			console.error('Erro ao carregar utilizadores para partilha:', err)
			errorMsg = 'Erro PocketBase: ' + (err.message || err.status || err)
		}
	})

	function handleUserSelect(e: any) {
		const email = e.target.value
		if (!email) return

		const user = registeredUsers.find((u: any) => u.email === email)
		if (!user) return

		if (sharedMembers.some((m: SharedMember) => m.email === email)) {
			errorMsg = 'Este utilizador já foi adicionado.'
			e.target.value = ''
			return
		}

		sharedMembers.push({
			id: user.id,
			email: user.email,
			isPending: false
		})
		errorMsg = ''
		e.target.value = ''
	}

	function removeMember(member: SharedMember) {
		sharedMembers = sharedMembers.filter((m: SharedMember) => m.email !== member.email)
	}
</script>

<Grid direction="column" gap="s">
	{#if errorMsg}
		<wa-callout variant="danger" class="error-callout">
			<wa-icon slot="icon" name="circle" class="icon-danger"></wa-icon>
			{errorMsg}
		</wa-callout>
	{/if}

	<wa-select
		id="share-user-select"
		label="Partilhar com"
		placeholder="Escolhe um utilizador..."
		onchange={handleUserSelect}
		class="input-grow"
	>
		{#each availableUsers as user}
			<wa-option value={user.email}>
				{user.name || user.username || user.email} ({user.email})
			</wa-option>
		{/each}
		{#if availableUsers.length === 0}
			<wa-option disabled>Nenhum utilizador disponível</wa-option>
		{/if}
	</wa-select>

	{#if sharedMembers.length > 0}
		<div class="shared-emails-container">
			<span class="shared-title">Membros Partilhados</span>
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

<style>
	.error-callout {
		margin-bottom: var(--wa-space-xs);
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
