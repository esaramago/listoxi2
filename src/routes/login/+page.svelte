<script lang="ts">
	import { pb } from '@/lib/pb'
	import Icon from '@/lib/components/Icon.svelte'
	import Grid from '@/components/ui/Grid.svelte'

	let email = $state('')
	let password = $state('')
	let loading = $state(false)
	let errorMsg = $state('')
	let successMsg = $state('')
	
	let isResetMode = $state(false)

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault()
		loading = true
		errorMsg = ''
		successMsg = ''

		try {
			await pb.collection('users').authWithPassword(email, password)
		} catch (err: any) {
			console.error(err)
			errorMsg = err.message || 'Email ou palavra-passe incorretos.'
		} finally {
			loading = false
		}
	}

	async function handlePasswordReset(e: SubmitEvent) {
		e.preventDefault()
		loading = true
		errorMsg = ''
		successMsg = ''

		try {
			await pb.collection('users').requestPasswordReset(email)
			successMsg = 'Instruções de recuperação enviadas para o seu email.'
			setTimeout(() => {
				isResetMode = false
			}, 3000)
		} catch (err: any) {
			console.error(err)
			errorMsg = err.message || 'Ocorreu um erro ao solicitar a recuperação.'
		} finally {
			loading = false
		}
	}
</script>

<Grid class="container login-container" align="center" justify="center">
	<wa-card class="login-card">
		<div slot="header" class="login-header">
			<h2 class="login-logo">Listoxi</h2>
			<p class="login-subtitle">
				{isResetMode ? 'Recuperar palavra-passe' : 'Inicia a sessão para aceder às listas'}
			</p>
		</div>

		<Grid direction="column" gap="m">
			{#if errorMsg}
				<wa-callout variant="danger">
					<Icon slot="icon" name="circle" class="icon-danger" />
					{errorMsg}
				</wa-callout>
			{/if}

			{#if successMsg}
				<wa-callout variant="success">
					<Icon slot="icon" name="cloud-check" class="icon-success" />
					{successMsg}
				</wa-callout>
			{/if}

			{#if !isResetMode}
				<form onsubmit={handleLogin}>
					<Grid direction="column" gap="m">
						<wa-input
							id="email"
							label="Email"
							type="email"
							placeholder="exemplo@email.com"
							value={email}
							oninput={(e: any) => email = e.target.value}
							required
						></wa-input>

						<wa-input
							id="password"
							type="password"
							placeholder="••••••••"
							value={password}
							oninput={(e: any) => password = e.target.value}
							required
							password-toggle
						>
							<div slot="label" class="password-label-wrapper">
								<span>Palavra-passe</span>
								<button 
									type="button" 
									onclick={() => isResetMode = true}
									class="btn-link"
								>
									Esqueceste-te?
								</button>
							</div>
						</wa-input>

						<wa-button 
							type="submit" 
							variant="primary" 
							class="btn-submit"
							loading={loading ? true : undefined}
						>
							Entrar
						</wa-button>
					</Grid>
				</form>
			{:else}
				<form onsubmit={handlePasswordReset}>
					<Grid direction="column" gap="m">
						<wa-input
							id="reset-email"
							label="Email da conta"
							type="email"
							placeholder="exemplo@email.com"
							value={email}
							oninput={(e: any) => email = e.target.value}
							required
						></wa-input>

						<wa-button 
							type="submit" 
							variant="primary" 
							class="btn-submit"
							loading={loading ? true : undefined}
						>
							Enviar instruções
						</wa-button>

						<button 
							type="button" 
							onclick={() => isResetMode = false}
							class="btn-back"
						>
							Voltar para o Login
						</button>
					</Grid>
				</form>
			{/if}
		</Grid>
	</wa-card>
</Grid>

<style>
	:global(.login-container) {
		min-height: 80vh;
	}
	.login-card {
		width: 100%;
		max-width: 400px;
		--border-radius: var(--wa-border-radius-l);
	}
	.login-card::part(body) {
		padding: var(--wa-space-m);
	}
	.login-header {
		text-align: center;
		padding: var(--wa-space-s) 0;
	}
	.login-logo {
		margin: 0;
		font-weight: 800;
		font-size: var(--wa-font-size-3xl);
		letter-spacing: -1px;
		color: var(--wa-color-brand-50);
	}
	.login-subtitle {
		margin: var(--wa-space-3xs) 0 0 0;
		color: var(--wa-color-neutral-60);
		font-size: var(--wa-font-size-s);
	}
	.icon-danger {
		color: var(--wa-color-danger-50);
	}
	.icon-success {
		color: var(--wa-color-success-50);
	}
	.password-label-wrapper {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
	.btn-link {
		background: none;
		border: none;
		color: var(--wa-color-brand-50);
		font-size: var(--wa-font-size-xs);
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}
	.btn-link:hover {
		color: var(--wa-color-brand-40);
		text-decoration: underline;
	}
	.btn-submit {
		width: 100%;
		margin-top: var(--wa-space-xs);
	}
	.btn-back {
		display: block;
		width: 100%;
		background: none;
		border: none;
		color: var(--wa-color-neutral-60);
		font-size: var(--wa-font-size-s);
		font-weight: 500;
		cursor: pointer;
		text-align: center;
		margin-top: var(--wa-space-xs);
	}
	.btn-back:hover {
		color: var(--wa-color-neutral-80);
		text-decoration: underline;
	}
</style>
