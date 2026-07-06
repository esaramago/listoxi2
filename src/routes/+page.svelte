<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '@/lib/db';
	import { pb } from '@/lib/pb';
	import { syncState } from '@/lib/sync';
	import Icon from '@/lib/components/Icon.svelte';
	import Grid from '@/components/ui/Grid.svelte';

	// Reactive query for lists with their corresponding item counts
	const listsWithCounts = liveQuery(async () => {
		const allLists = await db.lists.where('sync_status').notEqual('deleted').toArray()
		const result = [];
		for (const list of allLists) {
			const count = await db.items
				.where('list')
				.equals(list.id)
				.and((item) => item.sync_status !== 'deleted')
				.count()
			result.push({ ...list, count })
		}
		return result
	})

	function logout() {
		if (confirm('Deseja realmente sair?')) {
			pb.authStore.clear()
		}
	}

	let isDark = $state(false);

	// Watch theme state
	if (typeof window !== 'undefined') {
		isDark = document.documentElement.classList.contains('wa-dark')
	}

	function toggleTheme() {
		isDark = !isDark
		if (isDark) {
			document.documentElement.classList.add('wa-dark')
			localStorage.setItem('theme', 'dark')
		} else {
			document.documentElement.classList.remove('wa-dark')
			localStorage.setItem('theme', 'light')
		}
	}
</script>

<div class="container">
	<!-- Top Header -->
	<header class="header">
		<div class="header-title-container">
			<h1 class="header-title">Listoxi</h1>
			<p class="header-subtitle">
				<!-- Sync Badge -->
				{#if $syncState === 'synced'}
					<span class="sync-badge synced" title="Sincronizado">
						<Icon name="cloud-check" />
					</span>
					<span>Sincronizado</span>
				{:else if $syncState === 'syncing'}
					<span class="sync-badge syncing" title="A Sincronizar...">
						<Icon name="cloud-sync" />
					</span>
					<span>A sincronizar...</span>
				{:else if $syncState === 'offline-pending'}
					<span class="sync-badge pending" title="Offline com alterações pendentes">
						<Icon name="cloud-offline" />
					</span>
					<span>Offline (pendente)</span>
				{:else}
					<span class="sync-badge offline" title="Offline">
						<Icon name="cloud-offline" />
					</span>
					<span>Offline</span>
				{/if}
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="action-buttons">
			<wa-button circle variant="text" onclick={toggleTheme} title="Alternar Tema">
				<Icon name={isDark ? 'sun' : 'moon'} />
			</wa-button>
			<wa-button circle variant="text" onclick={logout} title="Sair da Conta">
				<Icon name="logout" />
			</wa-button>
		</div>
	</header>

	<!-- Lists container -->
	<div class="lists-wrapper">
		{#if !$listsWithCounts}
			<div class="loading-state">
				A carregar listas...
			</div>
		{:else if $listsWithCounts.length === 0}
			<Grid direction="column" align="center" gap="m" class="empty-state-card">
				<Icon name="cloud" class="empty-state-icon" />
				<div>
					<h3 class="empty-state-title">Nenhuma lista criada</h3>
					<p class="empty-state-subtitle">Crie a sua primeira lista de compras clicando no botão abaixo.</p>
				</div>
				<wa-button variant="primary" pill href="/lists/create">
					<Icon slot="prefix" name="plus" />
					Criar Lista
				</wa-button>
			</Grid>
		{:else}
			{#each $listsWithCounts as list (list.id)}
				<a href="/lists/{list.id}" class="card-link">
					<div class="list-card">
						<div class="list-card-title">
							<span>
								{#if list.name.toLowerCase().includes('casa') || list.name.toLowerCase().includes('padrões') || list.name.toLowerCase().includes('louriceira')}
									🏡
								{:else if list.name.toLowerCase().includes('lidl') || list.name.toLowerCase().includes('continente') || list.name.toLowerCase().includes('compras')}
									🛒
								{:else}
									🍏
								{/if}
							</span>
							<span>{list.name}</span>
						</div>
						<div class="list-card-count">
							<span class="list-card-number">{list.count}</span>
							<span class="list-card-label">produtos</span>
						</div>
					</div>
				</a>
			{/each}
		{/if}
	</div>

	<!-- Floating Add Button -->
	{#if $listsWithCounts && $listsWithCounts.length > 0}
		<div class="fab">
			<wa-button circle variant="primary" size="large" href="/lists/create" title="Criar Nova Lista" class="fab-btn">
				<Icon name="plus" class="fab-icon" />
			</wa-button>
		</div>
	{/if}
</div>

<style>
	.lists-wrapper {
		margin-top: var(--wa-space-xs);
	}
	.loading-state {
		text-align: center;
		padding: var(--wa-space-2xl);
		color: var(--wa-color-neutral-60);
	}
	:global(.empty-state-card) {
		text-align: center;
		padding: var(--wa-space-3xl) var(--wa-space-m);
		border: 2px dashed var(--wa-color-neutral-30);
		border-radius: var(--wa-border-radius-l);
		color: var(--wa-color-neutral-60);
	}
	.empty-state-icon {
		width: var(--wa-space-3xl);
		height: var(--wa-space-3xl);
		opacity: 0.3;
		color: var(--wa-color-neutral-60);
	}
	.empty-state-title {
		margin: 0;
		font-size: var(--wa-font-size-l);
		font-weight: 700;
		color: var(--wa-color-neutral-80);
	}
	.empty-state-subtitle {
		margin: var(--wa-space-3xs) 0 0 0;
		font-size: var(--wa-font-size-s);
		color: var(--wa-color-neutral-60);
	}
	.fab-btn {
		--size-large: 56px;
		box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
	}
	.fab-icon {
		width: var(--wa-space-l);
		height: var(--wa-space-l);
	}
</style>
