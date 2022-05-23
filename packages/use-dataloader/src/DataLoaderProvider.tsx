import PropTypes from 'prop-types'
import {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import {
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  KEY_IS_NOT_STRING_ERROR,
} from './constants'
import DataLoader from './dataloader'
import { OnErrorFn, PromiseType } from './types'

type CachedData = Record<string, unknown>
type Reloads = Record<string, () => Promise<void | unknown>>
type Requests = Record<string, DataLoader>

type UseDataLoaderInitializerArgs<T = unknown> = {
  method: () => PromiseType<T>
  /**
   * Max time before data from previous success is considered as outdated (in millisecond)
   */
  maxDataLifetime?: number
  enabled?: boolean
}

type GetCachedDataFn = {
  (): CachedData
  (key?: string): unknown | undefined
}

type GetReloadsFn = {
  (): Reloads
  (key?: string): (() => Promise<void | unknown>) | undefined
}

export interface IDataLoaderContext {
  addRequest: (key: string, args: UseDataLoaderInitializerArgs) => DataLoader
  getOrAddRequest: <T>(
    key: string,
    args: UseDataLoaderInitializerArgs<T>,
  ) => DataLoader<T>
  cacheKeyPrefix?: string
  onError?: (error: Error) => void | Promise<void>
  clearAllCachedData: () => void
  clearCachedData: (key: string) => void
  getCachedData: GetCachedDataFn
  getReloads: GetReloadsFn
  getRequest: (key: string) => DataLoader
  reload: (key?: string) => Promise<void>
  reloadAll: () => Promise<void>
}

// @ts-expect-error we force the context to undefined, should be corrected with default values
export const DataLoaderContext = createContext<IDataLoaderContext>(undefined)

const DataLoaderProvider = ({
  children,
  cacheKeyPrefix,
  onError,
  maxConcurrentRequests,
}: {
  children: ReactNode
  cacheKeyPrefix: string
  onError: OnErrorFn
  maxConcurrentRequests?: number
}): ReactElement => {
  const requestsRef = useRef<Requests>({})

  const computeKey = useCallback(
    (key: string) => `${cacheKeyPrefix ? `${cacheKeyPrefix}-` : ''}${key}`,
    [cacheKeyPrefix],
  )

  const getRequest = useCallback(
    (key: string) => requestsRef.current[computeKey(key)],
    [computeKey],
  )

  const addRequest = useCallback(
    (key: string, args: UseDataLoaderInitializerArgs) => {
      if (DataLoader.maxConcurrent !== maxConcurrentRequests) {
        DataLoader.maxConcurrent = maxConcurrentRequests as number
      }
      if (key && typeof key === 'string') {
        const newRequest = new DataLoader({
          ...args,
          key: computeKey(key),
        })

        requestsRef.current[newRequest.key] = newRequest

        return newRequest
      }
      throw new Error(KEY_IS_NOT_STRING_ERROR)
    },
    [computeKey, maxConcurrentRequests],
  )

  const getOrAddRequest = useCallback(
    (key: string, args: UseDataLoaderInitializerArgs) => {
      const requestFound = getRequest(key)
      if (!requestFound) {
        return addRequest(key, args)
      }

      return requestFound
    },
    [addRequest, getRequest],
  )

  const clearCachedData = useCallback(
    (key: string) => {
      if (typeof key === 'string') {
        if (requestsRef.current[computeKey(key)]) {
          requestsRef.current[computeKey(key)].clearData()
        }
      } else throw new Error(KEY_IS_NOT_STRING_ERROR)
    },
    [computeKey],
  )
  const clearAllCachedData = useCallback(() => {
    Object.values(requestsRef.current).forEach(request => {
      request.clearData()
    })
  }, [])

  const reload = useCallback(
    async (key?: string) => {
      if (key && typeof key === 'string') {
        await getRequest(key)?.load(true)
      } else throw new Error(KEY_IS_NOT_STRING_ERROR)
    },
    [getRequest],
  )

  const reloadAll = useCallback(async () => {
    await Promise.all(
      Object.values(requestsRef.current).map(request => request.load(true)),
    )
  }, [])

  const getCachedData = useCallback(
    (key?: string) => {
      if (key) {
        return getRequest(key)?.getData()
      }

      return Object.values(requestsRef.current).reduce(
        (acc, request) => ({
          ...acc,
          [request.key]: request.getData(),
        }),
        {} as CachedData,
      )
    },
    [getRequest],
  )

  const getReloads = useCallback(
    (key?: string) => {
      if (key) {
        return getRequest(key) ? () => getRequest(key).load(true) : undefined
      }

      return Object.entries(requestsRef.current).reduce(
        (acc, [requestKey, { load }]) => ({
          ...acc,
          [requestKey]: () => load(true),
        }),
        {} as Reloads,
      )
    },
    [getRequest],
  )

  const value = useMemo(
    () => ({
      addRequest,
      cacheKeyPrefix,
      clearAllCachedData,
      clearCachedData,
      getCachedData,
      getOrAddRequest,
      getReloads,
      getRequest,
      onError,
      reload,
      reloadAll,
    }),
    [
      addRequest,
      cacheKeyPrefix,
      clearAllCachedData,
      clearCachedData,
      getCachedData,
      getOrAddRequest,
      getRequest,
      getReloads,
      onError,
      reload,
      reloadAll,
    ],
  )

  return (
    <DataLoaderContext.Provider value={value as IDataLoaderContext}>
      {children}
    </DataLoaderContext.Provider>
  )
}

DataLoaderProvider.propTypes = {
  cacheKeyPrefix: PropTypes.string,
  children: PropTypes.node.isRequired,
  maxConcurrentRequests: PropTypes.number,
  onError: PropTypes.func,
}

DataLoaderProvider.defaultProps = {
  cacheKeyPrefix: undefined,
  maxConcurrentRequests: DEFAULT_MAX_CONCURRENT_REQUESTS,
  onError: undefined,
}

export const useDataLoaderContext = (): IDataLoaderContext =>
  useContext(DataLoaderContext)

export default DataLoaderProvider
