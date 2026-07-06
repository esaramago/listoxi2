<script lang="ts">
  import type { Spacing } from '@/types/grid'

  let {
    tag = 'div',
    direction,
    align,
    justify,
    gap,
    wrap,
    fullWidth = false,
    class: className = '',
    children
  }: {
    tag?: keyof HTMLElementTagNameMap;
    direction?: 'row' | 'column';
    align?: 'start' | 'center' | 'end';
    justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
    gap?: Spacing;
    wrap?: boolean;
    fullWidth?: boolean;
    class?: string;
    children?: any;
  } = $props()

  const gridStyle = $derived({
    '--gap': gap ? `var(--wa-space-${gap})` : undefined,
    '--align': align ?? undefined,
    '--justify': justify ?? undefined,
    '--wrap': wrap === true ? 'wrap' : wrap === false ? 'nowrap' : undefined,
    '--direction': direction ?? undefined
  })
</script>

<svelte:element this={tag} class="l-grid {className}" class:l-grid--full-width={fullWidth} style={gridStyle}>
  {@render children()}
</svelte:element>

<style>
  .l-grid {
    --gap: var(--wa-space-m);
    --align: initial;
    --justify: initial;
    --wrap: initial;
    --direction: initial;
    display: flex;
    flex-direction: var(--direction);
    gap: var(--gap);
    align-items: var(--align);
    justify-content: var(--justify);
    flex-wrap: var(--wrap);
  }
  .l-grid--full-width > * {
    width: 100%;
    flex: 1;
  }
</style>