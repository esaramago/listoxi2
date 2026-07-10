<script lang="ts">
	import Grid from './ui/Grid.svelte'
	import type { Snippet } from 'svelte'

	let {
		icon = 'cloud',
		title,
		subtitle,
		actionText,
		actionHref,
		actionIcon = 'plus',
		children
	}: {
		icon?: string
		title: string
		subtitle?: string
		actionText?: string
		actionHref?: string
		actionIcon?: string
		children?: Snippet
	} = $props()
</script>

<Grid direction="column" align="center" gap="m" class="empty-state-card">
  <wa-icon name={icon} class="empty-state-icon"></wa-icon>
	<div>
		<h3 class="empty-state-title">{title}</h3>
		{#if subtitle}
			<p class="empty-state-subtitle">{subtitle}</p>
		{/if}
	</div>
	{#if children}
		{@render children()}
	{:else if actionText && actionHref}
		<wa-button variant="brand" pill href={actionHref}>
			{#if actionIcon}
				<wa-icon slot="prefix" name={actionIcon}></wa-icon>
			{/if}
			{actionText}
		</wa-button>
	{/if}
</Grid>

<style>
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
</style>
