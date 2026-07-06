<script lang="ts">
	let {
		value = $bindable(''),
		label = 'Escolhe um Emoji'
	}: {
		value?: string;
		label?: string;
	} = $props();

	const emojis = [
		'🍏', '🛒', '🏡', '🍕', '💊', '🎒', '📚', '🛠️',
		'🐶', '👕', '🎁', '⚡', '🎉', '🚗', '💼', '❤️'
	];

	function selectEmoji(em: string) {
		if (value === em) {
			value = ''; // Remove selection
		} else {
			value = em;
		}
	}
</script>

<div class="emoji-picker-container">
	{#if label}
		<span class="emoji-label">{label}</span>
	{/if}
	<div class="emoji-grid">
		{#each emojis as em}
			<button
				type="button"
				class="emoji-option {value === em ? 'selected' : ''}"
				onclick={() => selectEmoji(em)}
				aria-label="Escolher emoji {em}"
			>
				{em}
			</button>
		{/each}
	</div>
</div>

<style>
	.emoji-picker-container {
		display: flex;
		flex-direction: column;
		gap: var(--wa-space-xs);
		margin-bottom: var(--wa-space-m);
	}

	.emoji-label {
		font-family: var(--wa-font-family-body, sans-serif);
		font-size: var(--wa-font-size-s);
		font-weight: 500;
		color: var(--wa-color-neutral-80);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: var(--wa-space-xs);
		background: rgba(148, 163, 184, 0.03);
		padding: var(--wa-space-s);
		border-radius: var(--wa-border-radius-m);
		border: 1px solid var(--wa-color-neutral-30);
	}

	@media (max-width: 480px) {
		.emoji-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.emoji-option {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--wa-border-radius-s);
		padding: var(--wa-space-xs);
		font-size: var(--wa-font-size-xl);
		cursor: pointer;
		transition: all 0.2s ease-in-out;
	}

	.emoji-option:hover {
		background: var(--wa-color-neutral-20);
		transform: scale(1.1);
	}

	.emoji-option:focus-visible {
		outline: 2px solid var(--wa-color-brand-50);
		outline-offset: 1px;
	}

	.emoji-option.selected {
		background: var(--wa-color-brand-10);
		border-color: var(--wa-color-brand-50);
		box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
		transform: scale(1.1);
	}
</style>
