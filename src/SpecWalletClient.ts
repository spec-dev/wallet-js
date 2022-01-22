import Web3Modal from 'web3modal'
import Web3 from 'web3'
import { firstOr } from './lib/helpers'

const DEFAULT_OPTIONS = {
    providerOptions: {},
    cacheProvider: true,
    disableInjectedProvider: false,
}

export default class SpecWalletClient {
    protected settings: object
    protected modal: Web3Modal | null
    protected provider: any
    protected web3: Web3 | null

    /**
     * Create a new web3 wallet client for use with Spec in the browser.
     * @param options.cacheProvider
     * @param options.disableInjectedProvider
     * @param options.providerOptions
     */
    constructor(options: {
        providerOptions?: object
        cacheProvider?: boolean
        disableInjectedProvider?: boolean
    }) {
        this.settings = { ...DEFAULT_OPTIONS, ...options }
        this.modal = null
        this.provider = null
        this.web3 = null
    }

    async connect() {
        this._resolveModal()
        await this._resolveProvider()
        this._resolveWeb3()
    }

    async signMessage(address: string, message: string) {
        return await this.web3?.eth.personal.sign(message, address, '')
    }

    async getCurrentAddress() {
        const accounts = await this.getAddresses()
        return firstOr(accounts, null)
    }

    async getAddresses() {
        return await this.web3?.eth.getAccounts()
    }

    private _resolveModal() {
        this.modal = this.modal || new Web3Modal(this.settings)
    }

    private async _resolveProvider() {
        try {
            this.provider = this.provider || (await this.modal?.connect())
        } catch (err) {
            throw `Error connecting to web3 provider: ${err}.`
        }
    }

    private _resolveWeb3() {
        this.web3 = this.web3 || new Web3(this.provider)
    }
}
