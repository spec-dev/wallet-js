export type Providers = {
    injected?: boolean
    walletConnect?: boolean
}

export type GenericObject = { [key: string]: any }

export interface Subscription {
    /**
     * The subscriber UUID. This will be set by the client.
     */
    id: string
    /**
     * The function to call every time there is an event. eg: (eventName) => {}
     */
    callback: (event: string, data: any) => void
    /**
     * Call this to remove the listener.
     */
    unsubscribe: () => void
}
