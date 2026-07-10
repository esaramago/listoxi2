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
  tag?: keyof HTMLElementTagNameMap
  direction?: 'row' | 'column'
  align?: 'start' | 'center' | 'end'
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly'
  gap?: Spacing
  wrap?: boolean
  fullWidth?: boolean
  class?: string
  children?: any
} = $props()

const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end' } as const

const gapStyle = $derived(gap ? `var(--wa-space-${gap})` : undefined)
const wrapStyle = $derived(wrap === true ? 'wrap' : wrap === false ? 'nowrap' : undefined)

</script>

<svelte:element
  this={tag}
  class="l-grid {className}"
  class:l-grid--full-width={fullWidth}
  style:--gap={gapStyle}
  style:--align={align ? alignMap[align] || align : undefined}
  style:--justify={justify}
  style:--wrap={wrapStyle}
  style:--direction={direction}
>
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