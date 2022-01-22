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
    protected _modal: Web3Modal | null
    protected _provider: any
    protected _web3: Web3 | null

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
        this._modal = null
        this._provider = null
        this._web3 = null
    }

    get modal(): Web3Modal {
        if (!this._modal) {
            this._modal = new Web3Modal(this.settings)
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

    async connect() {
        await this.getWeb3()
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
}
