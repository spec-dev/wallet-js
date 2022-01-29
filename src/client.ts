import Web3Modal, { ICoreOptions, IProviderOptions, ThemeColors } from 'web3modal'
import Web3 from 'web3'
import { firstOr } from './lib/helpers'
import { Providers, GenericObject } from './lib/types'
import { providers } from './lib/providers'
import { env } from './lib/env'
import WalletConnectProvider from '@walletconnect/web3-provider'

const DEFAULT_OPTIONS = {
    providers: {
        injected: true,
        [providers.WALLETCONNECT]: true,
    },
    modal: {
        cacheProvider: true,
    },
}

export default class SpecWalletClient {
    protected settings: {
        modal: Partial<ICoreOptions>
    }
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

    async getWeb3(): Promise<Web3> {
        if (!this._web3) {
            this._web3 = new Web3(await this.getProvider())
        }
        return this._web3
    }

    async getProvider(): Promise<any> {
        if (!this._provider) {
            this._provider = await this.modal.connect()
        }
        return this._provider
    }

    async connect(): Promise<any> {
        try {
            await this.getWeb3()
            return null
        } catch (err) {
            return err
        }
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

        // Enable WalletConnect provider if infuraId env var is set and it's not explictly disabled.
        if (env.INFURA_ID && enabledProviders[providers.WALLETCONNECT] !== false) {
            providerOptions[providers.WALLETCONNECT] = {
                package: WalletConnectProvider,
                options: {
                    infuraId: env.INFURA_ID,
                },
            }
        }

        // Override providers with those explicitly specified in modal options.
        return { ...providerOptions, ...(modalOptions.providerOptions || {}) }
    }
}
