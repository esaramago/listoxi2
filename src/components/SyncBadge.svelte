<script lang="ts">
	import { syncState } from '@/lib/sync';
</script>

<span class="sync-status">
	{#if $syncState === 'synced'}
		<span class="sync-badge synced" title="Sincronizado">
			<wa-icon name="cloud"></wa-icon>
		</span>
		<span>Sincronizado</span>
	{:else if $syncState === 'syncing'}
		<span class="sync-badge syncing" title="A Sincronizar...">
			<wa-icon name="cloud-arrow-up"></wa-icon>
		</span>
		<span>A sincronizar...</span>
	{:else if $syncState === 'offline-pending'}
		<span class="sync-badge pending" title="Offline com alterações pendentes">
			<wa-icon name="cloud"></wa-icon>
		</span>
		<span>Offline (pendente)</span>
	{:else}
		<span class="sync-badge offline" title="Offline">
			<wa-icon name="cloud"></wa-icon>
		</span>
		<span>Offline</span>
	{/if}
</span>

<style>
	.sync-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.sync-badge {
		border-radius: 50%;
		justify-content: center;
		align-items: center;
		width: 24px;
		height: 24px;
		transition: color 0.3s;
		display: inline-flex;
	}

	.sync-badge.synced {
		color: #10b981;
	}

	.sync-badge.syncing {
		color: #3b82f6;
		animation: 2s linear infinite spin;
	}

	.sync-badge.pending {
		color: #f59e0b;
	}

	.sync-badge.offline {
		color: #ef4444;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
