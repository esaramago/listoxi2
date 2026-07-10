<script lang="ts">
import type { Snippet } from 'svelte'

let {
  backHref,
  title,
  subtitle,
  titleSnippet,
  subtitleSnippet,
  actions,
  class: className = ''
}: {
  backHref?: string
  title?: string
  subtitle?: string
  titleSnippet?: Snippet
  subtitleSnippet?: Snippet
  actions?: Snippet
  class?: string
} = $props()
</script>

<header class="header {className}">
	<div class="header-title-container">
		{#if backHref}
			<a href={backHref} class="back-title-link">
				<span class="back-arrow">&larr;</span>
				{#if titleSnippet}
					{@render titleSnippet()}
				{:else if title}
					<h1 class="header-title">{title}</h1>
				{/if}
			</a>
		{:else}
			{#if titleSnippet}
				{@render titleSnippet()}
			{:else if title}
				<h1 class="header-title">{title}</h1>
			{/if}
		{/if}

		{#if subtitleSnippet}
			{@render subtitleSnippet()}
		{:else if subtitle}
			<p class="header-subtitle">{subtitle}</p>
		{/if}
	</div>

	{#if actions}
		<wa-dropdown placement="bottom-end">
			<wa-button slot="trigger" circle appearance="plain" title="Opções" variant="brand">
				<wa-icon name="ellipsis-vertical"></wa-icon>
			</wa-button>
			{@render actions()}
		</wa-dropdown>
	{/if}
</header>

<style>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.header-title-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-subtitle, :global(.header-subtitle) {
  font-size: 14px;
  color: #71717a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-title, :global(.header-title) {
  font-size: 26px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
}
.back-title-link {
  display: inline-flex;
  align-items: center;
  gap: var(--wa-space-xs);
  text-decoration: none;
  color: inherit;
}
.back-title-link:hover {
  text-decoration: none;
  color: inherit;
}

.back-arrow {
  display: inline-flex;
  align-items: center;
  color: var(--wa-color-brand-50);
  font-size: 26px;
  font-weight: 800;
  transition: transform 0.2s ease, color 0.2s ease;
}
.back-title-link:hover .back-arrow {
  transform: translateX(-4px);
  color: var(--wa-color-brand-40);
}
</style>
