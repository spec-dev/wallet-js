import Web3Modal, { ICoreOptions, IProviderOptions, ThemeColors } from 'web3modal'
import Web3 from 'web3'
import { firstOr, uuid, isBrowser } from './lib/helpers'
import { Providers, GenericObject, Subscription } from './lib/types'
import { providers, providerEvents } from './lib/providers'
import events from './lib/events'
import { env } from './lib/env'
import WalletConnectProvider from '@walletconnect/web3-provider'
import WalletLink from 'walletlink'

const DEFAULT_OPTIONS = {
    providers: {
        injected: true,
        [providers.WALLETCONNECT]: true,
        [providers.WALLETLINK]: false,
    },
    modal: {
        cacheProvider: true,
    },
}

export default class SpecWalletClient {
    protected settings: {
        modal: Partial<ICoreOptions>
    }

    protected stateChangeEmitters: Map<string, Subscription> = new Map()
    protected _modal: Web3Modal | null
    protected _provider: any
    protected _web3: Web3 | null

    /**
     * Create a new web3 wallet client for use with Spec in the browser.
     * @param options.network
     * @param options.providers
     * @param options.theme
     * @param options.modal
     */
    constructor(options?: {
        network?: string
        providers?: Providers
        theme?: string | ThemeColors
        modal?: Partial<ICoreOptions>
    }) {
        const modalOptions = { ...DEFAULT_OPTIONS.modal, ...(options?.modal || {}) }
        const theme = modalOptions?.theme || options?.theme
        const network = modalOptions?.network || options?.network
        if (network) {
            modalOptions.network = network
        }
        if (theme) {
            modalOptions.theme = theme
        }
        const enabledProviders = { ...DEFAULT_OPTIONS.providers, ...(options?.providers || {}) }
        modalOptions.disableInjectedProvider = this._shouldDisableInjectedProvider(
            modalOptions,
            enabledProviders
        )
        modalOptions.providerOptions = this._resolveProviderOptions(modalOptions, enabledProviders)
        this.settings = { modal: modalOptions }
        this._modal = null
        this._provider = null
        this._web3 = null
    }

    get modal(): Web3Modal {
        if (!this._modal) {
            this._modal = new Web3Modal(this.settings.modal)
        }
        return this._modal
    }

    get hasCachedProvider(): boolean {
        return (
            !!this.modal.cachedProvider ||
            (isBrowser() && !!(localStorage?.getItem('WEB3_CONNECT_CACHED_PROVIDER')))
        )
    }

    async connect(): Promise<any> {
        try {
            await this.getWeb3()
            return null
        } catch (err) {
            return err
        }
    }

    async disconnect() {
        if (!this._provider) return

        try {
            this._provider.close && (await this._provider.close())
            await this.modal.clearCachedProvider()
            this._provider = null
        } catch (err) {
            console.warn('Error disconnecting wallet', err)
        }
    }

    /**
     * Receive a notification every time an auth event happens.
     * @returns {Subscription} A subscription object which can be used to unsubscribe itself.
     */
    onStateChange(callback: (event: string, data: any) => void): {
        listener: Subscription | null
        error: any
    } {
        try {
            const id: string = uuid()
            const subscription: Subscription = {
                id,
                callback,
                unsubscribe: () => {
                    this.stateChangeEmitters.delete(id)
                },
            }
            this.stateChangeEmitters.set(id, subscription)
            return { listener: subscription, error: null }
        } catch (error) {
            return { listener: null, error }
        }
    }

    async getWeb3(): Promise<Web3> {
        if (!this._web3) {
            this._web3 = new Web3(await this.getProvider())
        }
        return this._web3
    }

    async getProvider(): Promise<any> {
        if (!this._provider) {
            this._provider = await this._createProvider()
        }
        return this._provider
    }

    async signMessage(address: string, message: string, password: string): Promise<string> {
        const web3 = await this.getWeb3()
        return await web3.eth.personal.sign(message, address, password)
    }

    async getCurrentAddress(): Promise<string | null> {
        const accounts = await this.getAddresses()
        return firstOr(accounts, null)
    }

    async getAddresses(): Promise<string[]> {
        const web3 = await this.getWeb3()
        return await web3.eth.getAccounts()
    }

    private async _createProvider(): Promise<any> {
        // Request connection to user's wallet.
        const provider = await this.modal.connect()
        if (!provider) throw "Couldn't establish wallet connection"

        // Event: Provider connected.
        provider.on(providerEvents.CONNECT, (info: { chainId: number }) => {
            this._notifyAllSubscribers(events.CONNECTED, info)
        })

        // Event: Provider disconnected.
        provider.on(providerEvents.DISCONNECT, (error: { code: number; message: string }) => {
            this._notifyAllSubscribers(events.DISCONNECTED, error)
        })

        // Event: User switched accounts within the wallet.
        provider.on(providerEvents.ACCOUNTS_CHANGED, async () => {
            const newAddress = await this.getCurrentAddress()
            this._notifyAllSubscribers(events.ACCOUNT_CHANGED, {
                address: newAddress,
            })
        })

        // Event: Switched chains.
        provider.on(providerEvents.CHAIN_CHANGED, (chainId: number) => {
            this._notifyAllSubscribers(events.CHAIN_CHANGED, { chainId })
        })

        return provider
    }

    private _notifyAllSubscribers(event: string, data: object) {
        this.stateChangeEmitters.forEach((x) => x.callback(event, data))
    }

    private _shouldDisableInjectedProvider(
        modalOptions: GenericObject,
        enabledProviders: GenericObject
    ): boolean {
        if ('disableInjectedProvider' in modalOptions) {
            return modalOptions.disableInjectedProvider
        }
        if ('injected' in enabledProviders) {
            return !enabledProviders.injected
        }
        return false
    }

    private _resolveProviderOptions(
        modalOptions: GenericObject,
        enabledProviders: GenericObject
    ): IProviderOptions {
        const providerOptions: IProviderOptions = {}

        // Enable WalletConnect if not explicitly disabled and infuraId env-var is set.
        if (env.INFURA_ID && enabledProviders[providers.WALLETCONNECT] !== false) {
            providerOptions[providers.WALLETCONNECT] = {
                package: WalletConnectProvider,
                options: {
                    infuraId: env.INFURA_ID,
                },
            }
        }

        // Enable Walletlink (Coinbase Wallet) if not explicitly disabled and infuraId env-var is set.
        if (env.INFURA_ID && enabledProviders[providers.WALLETLINK] !== false) {
            providerOptions[providers.WALLETLINK] = {
                package: WalletLink,
                options: {
                    appName: 'Coinbase',
                    infuraId: env.INFURA_ID,
                },
            }
        }

        // Override providers with those explicitly specified in modal options.
        return { ...providerOptions, ...(modalOptions.providerOptions || {}) }
    }
}
