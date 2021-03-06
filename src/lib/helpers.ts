export function firstOr(arr: any[] = [], fallback: any = null) {
    return arr && arr.length ? arr[0] : fallback
}

export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export const isBrowser = () => typeof window !== 'undefined'
