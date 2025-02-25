import { act, renderHook, waitFor } from '@testing-library/react'
import mockdate from 'mockdate'
import type { ReactNode } from 'react'
import I18n, { useI18n, useTranslation } from '..'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'

const LOCALE_ITEM_STORAGE = 'locales'

type Locale = {
  test: 'Test'
  'with.identifier': 'Are you sure you want to delete {identifier}?'
  plurals: '{numPhotos, plural, =0 {You have one photo.} other {You have # photos.}}'
  subtitle: 'Here is a subtitle'
  'tests.test.namespaces': 'test'
  title: 'Welcome on @scaelway/ui i18n hook'
}

type NamespaceLocale = {
  name: 'Name'
  lastName: 'Last Name'
  languages: 'Languages'
}

const wrapper =
  ({
    loadDateLocale = async (locale: string) =>
      import(`date-fns/locale/${locale}/index`),
    defaultLoad = async ({ locale }: { locale: string }) =>
      import(`./locales/${locale}.json`),
    defaultLocale = 'en',
    defaultTranslations = {},
    enableDebugKey = false,
    enableDefaultLocale = false,
    localeItemStorage = LOCALE_ITEM_STORAGE,
    supportedLocales = ['en', 'fr', 'es'],
  } = {}) =>
  ({ children }: { children: ReactNode }) =>
    (
      <I18n
        loadDateLocale={loadDateLocale}
        defaultLoad={defaultLoad}
        defaultLocale={defaultLocale}
        defaultTranslations={defaultTranslations}
        enableDebugKey={enableDebugKey}
        enableDefaultLocale={enableDefaultLocale}
        localeItemStorage={localeItemStorage}
        supportedLocales={supportedLocales}
      >
        {children}
      </I18n>
    )

describe('i18n hook', () => {
  beforeEach(() => {
    jest.spyOn(window, 'navigator', 'get').mockImplementation(
      () =>
        ({
          language: 'en-US',
          languages: ['en-US', 'en'],
        } as unknown as Navigator),
    )
  })

  afterEach(() => {
    localStorage.clear()
    mockdate.reset()
    jest.clearAllMocks()
  })

  it('useTranslation should not be defined without I18nProvider', () => {
    const orignalConsoleError = console.error
    console.error = jest.fn

    try {
      renderHook(() => useTranslation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <div>{children}</div>
        ),
      })
    } catch (error) {
      expect((error as Error).message).toBe(
        'useTranslation must be used within a I18nProvider',
      )
    }

    console.error = orignalConsoleError
  })

  it('useI18n should not be defined without I18nProvider', () => {
    const orignalConsoleError = console.error
    console.error = jest.fn

    try {
      renderHook(() => useI18n(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <div>{children}</div>
        ),
      })
    } catch (error) {
      expect((error as Error).message).toBe(
        'useI18n must be used within a I18nProvider',
      )
    }

    console.error = orignalConsoleError
  })

  it('should use defaultLoad, useTranslation, switch local and translate', async () => {
    const { result } = renderHook(() => useTranslation<Locale>([]), {
      wrapper: wrapper({ defaultLocale: 'en' }),
    })
    // first render there is no load
    expect(result.current.t('title')).toEqual('')

    await waitFor(() => {
      // after load of en locale
      expect(result.current.t('title')).toEqual(en.title)
    })

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.t('title')).toEqual(fr.title)
    })

    act(() => {
      result.current.switchLocale('es')
    })

    await waitFor(() => {
      expect(result.current.t('title')).toEqual(es.title)
    })
  })

  it('should use specific load on useTranslation', async () => {
    const load = async ({
      locale,
      namespace,
    }: {
      locale: string
      namespace: string
    }) => import(`./locales/namespaces/${locale}/${namespace}.json`)

    const { result } = renderHook(
      () => useTranslation<NamespaceLocale>(['user', 'profile'], load),
      {
        wrapper: wrapper({
          defaultLocale: 'en',
          supportedLocales: ['en', 'fr'],
        }),
      },
    )

    await waitFor(() => {
      expect(result.current.translations).toStrictEqual({
        en: {
          languages: 'Languages',
          lastName: 'Last Name',
          name: 'Name',
        },
      })
    })

    expect(result.current.t('name')).toEqual('Name')
    expect(result.current.t('lastName')).toEqual('Last Name')
    expect(result.current.t('languages')).toEqual('Languages')

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.translations).toStrictEqual({
        en: {
          languages: 'Languages',
          lastName: 'Last Name',
          name: 'Name',
        },
        fr: {
          lastName: 'Nom',
          name: 'Prénom',
        },
      })
    })

    expect(result.current.t('name')).toEqual('Prénom')
    expect(result.current.t('lastName')).toEqual('Nom')
    expect(result.current.t('languages')).toEqual('')
  })

  it("should use specific load and fallback default local if the key doesn't exist", async () => {
    const load = async ({
      locale,
      namespace,
    }: {
      locale: string
      namespace: string
    }) => import(`./locales/namespaces/${locale}/${namespace}.json`)

    const { result } = renderHook(
      () => useTranslation<NamespaceLocale>(['user'], load),
      {
        wrapper: wrapper({
          defaultLocale: 'fr',
          enableDefaultLocale: true,
          supportedLocales: ['en', 'fr'],
        }),
      },
    )

    // current local will be 'en' based on navigator
    // await load of locales
    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.translations).toStrictEqual({
        en: {
          languages: 'Languages',
          lastName: 'Last Name',
          name: 'Name',
        },
        fr: {
          lastName: 'Nom',
          name: 'Prénom',
        },
      })

      expect(result.current.t('languages')).toEqual('')
      expect(result.current.t('lastName')).toEqual('Nom')
      expect(result.current.t('name')).toEqual('Prénom')
    })
  })

  it('should set current locale from defaultLocale', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'fr',
        supportedLocales: ['en', 'fr', 'es'],
      }),
    })

    await waitFor(() => {
      expect(result.current.currentLocale).toEqual('en')
    })
  })

  describe('getCurrentLocale', () => {
    it('should set current locale from localStorage', async () => {
      jest.spyOn(global, 'navigator', 'get').mockReturnValueOnce({
        languages: ['fr'],
      } as unknown as Navigator)
      const mockGetItem = jest.fn().mockImplementation(() => 'en')
      const mockSetItem = jest.fn()
      const localStorageMock = jest
        .spyOn(global, 'localStorage', 'get')
        .mockReturnValue({
          getItem: mockGetItem,
          setItem: mockSetItem,
          clear: jest.fn(),
        } as unknown as Storage)

      const { result } = renderHook(() => useI18n(), {
        wrapper: wrapper({
          defaultLocale: 'es',
          supportedLocales: ['en', 'fr', 'es'],
        }),
      })

      await waitFor(() => {
        expect(result.current.currentLocale).toEqual('en')
        expect(mockGetItem).toHaveBeenCalledTimes(2)
        expect(mockGetItem).toHaveBeenCalledWith(LOCALE_ITEM_STORAGE)
      })
      localStorageMock.mockRestore()
    })

    it('should set current locale from navigator', async () => {
      jest.spyOn(global, 'navigator', 'get').mockReturnValueOnce({
        languages: ['fr'],
      } as unknown as Navigator)
      const mockGetItem = jest.fn()
      const mockSetItem = jest.fn()
      const localStorageMock = jest
        .spyOn(global, 'localStorage', 'get')
        .mockReturnValueOnce({
          getItem: mockGetItem,
          setItem: mockSetItem,
          clear: jest.fn(),
        } as unknown as Storage)

      const { result } = renderHook(() => useI18n(), {
        wrapper: wrapper({
          defaultLocale: 'es',
          supportedLocales: ['en', 'fr', 'es'],
        }),
      })

      await waitFor(() => {
        expect(result.current.currentLocale).toEqual('fr')
      })
      localStorageMock.mockRestore()
    })

    it('should set current locale from defaultLocale', async () => {
      jest.spyOn(global, 'navigator', 'get').mockReturnValueOnce({
        languages: [],
      } as unknown as Navigator)
      const mockGetItem = jest.fn()
      const mockSetItem = jest.fn()
      const localStorageMock = jest
        .spyOn(global, 'localStorage', 'get')
        .mockReturnValueOnce({
          getItem: mockGetItem,
          setItem: mockSetItem,
          clear: jest.fn(),
        } as unknown as Storage)

      const { result } = renderHook(() => useI18n(), {
        wrapper: wrapper({
          defaultLocale: 'es',
          supportedLocales: ['en', 'fr', 'es'],
        }),
      })

      await waitFor(() => {
        expect(result.current.currentLocale).toEqual('es')
      })
      localStorageMock.mockRestore()
    })
  })

  it('should switch locale', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr', 'es'],
      }),
    })
    expect(result.current.currentLocale).toEqual('en')
    expect(localStorage.getItem(LOCALE_ITEM_STORAGE)).toBe(null)

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.currentLocale).toEqual('fr')
    })
    expect(localStorage.getItem(LOCALE_ITEM_STORAGE)).toBe('fr')

    act(() => {
      result.current.switchLocale('es')
    })

    await waitFor(() => {
      expect(result.current.currentLocale).toEqual('es')
    })
    expect(localStorage.getItem(LOCALE_ITEM_STORAGE)).toBe('es')

    act(() => {
      result.current.switchLocale('test')
    })

    await waitFor(() => {
      expect(result.current.currentLocale).toEqual('es')
    })
    expect(localStorage.getItem(LOCALE_ITEM_STORAGE)).toBe('es')
  })

  it('should translate correctly with enableDebugKey', async () => {
    const { result } = renderHook(() => useI18n<Locale>(), {
      wrapper: wrapper({
        defaultLocale: 'en',
        defaultTranslations: { en },
        enableDebugKey: true,
        supportedLocales: ['en', 'fr'],
      }),
    })
    expect(result.current.t('test')).toEqual('test')

    await waitFor(() => {
      expect(result.current.t('title')).toEqual('title')
      expect(result.current.t('subtitle')).toEqual('subtitle')
      expect(result.current.t('plurals', { numPhotos: 0 })).toEqual('plurals')
      expect(result.current.t('plurals', { numPhotos: 1 })).toEqual('plurals')
      expect(result.current.t('plurals', { numPhotos: 2 })).toEqual('plurals')
    })
  })

  it('should use namespaceTranslation', async () => {
    const { result } = renderHook(() => useI18n<Locale>(), {
      wrapper: wrapper({
        defaultLocale: 'en',
        defaultTranslations: { en },
      }),
    })
    await waitFor(() => {
      const identiqueTranslate = result.current.namespaceTranslation('tests')
      expect(identiqueTranslate('test.namespaces')).toEqual(
        result.current.t('tests.test.namespaces'),
      )
    })

    const translate = result.current.namespaceTranslation('tests.test')
    expect(translate('namespaces')).toEqual('test')
  })

  it('should use formatNumber', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })
    expect(result.current.formatNumber(2)).toEqual('2')
    expect(
      result.current.formatNumber(2, {
        currency: 'EUR',
        currencyDisplay: 'symbol',
        style: 'currency',
      }),
    ).toEqual('€2.00')

    expect(
      result.current.formatNumber(2, {
        currency: 'USD',
        currencyDisplay: 'symbol',
        style: 'currency',
      }),
    ).toEqual('$2.00')

    act(() => {
      result.current.switchLocale('fr')
    })

    // https://stackoverflow.com/questions/58769806/identical-strings-not-matching-in-jest
    // https://stackoverflow.com/questions/54242039/intl-numberformat-space-character-does-not-match

    await waitFor(() => {
      expect(
        result.current.formatNumber(2, {
          currency: 'EUR',
          style: 'currency',
        }),
      ).toEqual('2,00\xa0€')
    })

    expect(
      result.current.formatNumber(2, { currency: 'USD', style: 'currency' }),
    ).toEqual('2,00\xa0$US')
  })

  it('should use formatList', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })
    const vehicles = ['Motorcycle', 'Bus', 'Car']

    expect(
      result.current.formatList(vehicles, {
        style: 'long',
        type: 'conjunction',
      }),
    ).toEqual('Motorcycle, Bus, and Car')

    expect(
      result.current.formatList(vehicles, {
        style: 'short',
        type: 'disjunction',
      }),
    ).toEqual('Motorcycle, Bus, or Car')

    expect(
      result.current.formatList(vehicles, {
        style: 'narrow',
        type: 'unit',
      }),
    ).toEqual('Motorcycle Bus Car')

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(
        result.current.formatList(vehicles, {
          style: 'long',
          type: 'conjunction',
        }),
      ).toEqual('Motorcycle, Bus et Car')
    })

    expect(
      result.current.formatList(vehicles, {
        style: 'short',
        type: 'disjunction',
      }),
    ).toEqual('Motorcycle, Bus ou Car')

    expect(
      result.current.formatList(vehicles, {
        style: 'narrow',
        type: 'unit',
      }),
    ).toEqual('Motorcycle Bus Car')
  })

  it('should use datetime', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })
    const date = new Date('December 17, 1995 03:24:00')

    await waitFor(() => {
      expect(result.current.datetime(date)).toEqual('12/17/1995')
    })

    expect(
      result.current.datetime(date, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }),
    ).toEqual('12/17/1995')

    expect(
      result.current.datetime(date, {
        day: '2-digit',
        era: 'short',
        month: 'short',
        year: 'numeric',
      }),
    ).toEqual('Dec 17, 1995 AD')

    expect(
      result.current.datetime(date, {
        day: '2-digit',
        era: 'long',
        month: 'long',
        year: 'numeric',
      }),
    ).toEqual('December 17, 1995 Anno Domini')

    expect(
      result.current.datetime(date, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }),
    ).toEqual('12/17/1995')

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.datetime(date)).toEqual('17/12/1995')
    })

    expect(
      result.current.datetime(date, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      }),
    ).toEqual('17/12/1995')

    expect(
      result.current.datetime(date, {
        day: '2-digit',
        era: 'long',
        month: 'long',
        year: 'numeric',
      }),
    ).toEqual('17 décembre 1995 après Jésus-Christ')
  })

  it('should relativeTime', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })
    mockdate.set('4/13/2021')
    const date = new Date('September 13, 2000 15:15:00')

    expect(result.current.relativeTime(date)).toEqual('over 20 years ago')

    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.relativeTime(date)).toEqual('il y a plus de 20 ans')
    })
  })

  it('should relativeTimeStrict', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })
    mockdate.set('4/13/2021')
    const date = new Date('September 13, 2011 15:15:00')

    expect(result.current.relativeTimeStrict(date)).toEqual('3499 days ago')
    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(result.current.relativeTimeStrict(date)).toEqual(
        'il y a 3499 jours',
      )
    })
  })

  it('should formatUnit', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })

    expect(
      result.current.formatUnit(12, { short: false, unit: 'byte' }),
    ).toEqual('12 bytes')
    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(
        result.current.formatUnit(12, { short: false, unit: 'byte' }),
      ).toEqual('12 octets')
    })
  })

  it('should formatDate', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'en',
      }),
    })

    expect(
      result.current.formatDate(new Date(2020, 1, 13, 16, 28), 'numericHour'),
    ).toEqual('2020-02-13 4:28 PM')
    act(() => {
      result.current.switchLocale('fr')
    })

    await waitFor(() => {
      expect(
        result.current.formatDate(new Date(2020, 1, 13, 16, 28), 'numericHour'),
      ).toEqual('2020-02-13 16:28')
    })
  })

  it('should load default datefns locales', async () => {
    const { result } = renderHook(() => useI18n(), {
      wrapper: wrapper({
        defaultLocale: 'test',
        supportedLocales: ['test'],
      }),
    })
    expect(result.current.dateFnsLocale).toBe(undefined)

    await waitFor(() => {
      expect(result.current.dateFnsLocale?.code).toEqual('en-GB')
    })
  })

  it('should work with a component', async () => {
    const { result } = renderHook(
      () => useTranslation<{ 'with.identifier': 'Hello {identifier}' }>([]),
      {
        wrapper: wrapper({ defaultLocale: 'en' }),
      },
    )
    const CustomComponent = ({ children }: { children: ReactNode }) => (
      <p style={{ fontWeight: 'bold' }}>{children}</p>
    )

    await waitFor(() => {
      expect(
        result.current.t('with.identifier', { identifier: <b>My resource</b> }),
      ).toEqual(['Are you sure you want to delete ', <b>My resource</b>, '?'])
      expect(
        result.current.t('with.identifier', {
          identifier: <CustomComponent>My resource</CustomComponent>,
        }),
      ).toEqual([
        'Are you sure you want to delete ',
        <CustomComponent>My resource</CustomComponent>,
        '?',
      ])
    })
  })
})
