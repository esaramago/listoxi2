<script lang="ts">
	import { goto } from '$app/navigation'

	let {
		productName,
		productQuantity,
		productDetails,
    isBought,
		listId,
		productId,
		deleteItem,
		toggleBought,
	}: {
		productName: string
		productQuantity: number
		productDetails?: string
		productId: string
    isBought: boolean
		listId: string
		deleteItem: (productId: string) => void
		toggleBought: (productId: string) => void
	} = $props()
</script>

<wa-card class="card">
  <button class="check-btn {isBought ? 'check-btn--bought' : ''}" onclick={(e) => { e.stopPropagation(); toggleBought(productId); }} title="Marcar como comprado"></button>
  <button class="card__link" onclick={() => goto(`/lists/${listId}/items/${productId}`)} role="link" tabindex="0" onkeydown={(e) => e.key === 'Enter' && goto(`/lists/${listId}/items/${productId}`)}>
    <span class="card__quantity">{productQuantity}</span>
    {productName}
    {#if productDetails}
      <p class="card__details">{productDetails}</p>
    {/if}
  </button>
  <wa-button onclick={() => deleteItem(productId)} title="Apagar produto" appearance="plain">
    <wa-icon name="trash" class="delete-icon"></wa-icon>
  </wa-button>
</wa-card>


<style>
.check-btn {
  width: var(--wa-space-xl);
  height: var(--wa-space-xl);
  flex: 0 0 var(--wa-space-xl);
  border-radius: 50%;
  border: 4px solid var(--wa-color-brand-60);
  background-color: var(--wa-color-neutral-80);
  display: flex;
  margin-block: auto;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  cursor: pointer;
  &:hover {
    background-color: var(--wa-color-brand-50);
  }
  &:active {
    background-color: var(--wa-color-brand-50);
  }
}
.card {
  font-weight: 500;
  &::part(body) {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    padding: 0 var(--wa-space-m);
    min-height: 5rem;
    gap: var(--wa-space-m);
  }
  wa-button {
    margin-block: auto;
  }
}
.card__link {
  flex-grow: 1;
  text-align: start;
}
.card__quantity {
  font-weight: 700;
  margin-inline-end: var(--wa-space-xs);
}
.card__details {
  font-size: var(--wa-font-size-s);
  color: var(--wa-color-neutral-60);
}
</style>
