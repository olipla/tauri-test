import { useFileDialog,
} from '@vueuse/core'
import { read, utils } from 'xlsx'

export interface ConfigurationAsset {
  assetInfoId: string
  coAssetId: string
  radioId: string
  radioIdFull: string
  wmbusKey: string
}

export interface Configuration {
  sFurnitureId: string
  sFurnitureAddress: string
  sFurnitureLatitude: number
  sFurnitureLongitude: number
  sFurnitureW3W: string
  assets: ConfigurationAsset[]
}

export interface AppliedConfiguration extends Configuration {
  timestamp: Date
  deviceId: string
}

export function useConfigurationImport() {
  const { open: openFile, onChange } = useFileDialog({
    accept: '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel',
    directory: false,
    multiple: false,
  })

  const importedConfigurations = ref<Configuration[]>([])
  const availableConfigurations = ref<Configuration[]>([])
  const filename = ref<string | undefined>()
  const appliedConfigurations = ref<AppliedConfiguration[]>([])

  function applyConfiguration(configuration: Configuration, deviceId: string) {
    const availableIndex = availableConfigurations.value.findIndex(x => x.sFurnitureId === configuration.sFurnitureId)
    const availableConfiguration = availableConfigurations.value[availableIndex]
    if (!availableConfiguration) {
      return
    }

    const timestamp = new Date()

    appliedConfigurations.value.push({ timestamp, deviceId, ...availableConfiguration })
    availableConfigurations.value.splice(availableIndex, 1)
  }

  function clearConfig() {
    filename.value = undefined
    availableConfigurations.value = []
    appliedConfigurations.value = []
    importedConfigurations.value = []
  }

  onChange(async (files) => {
    if (!files) {
      return
    }
    const file = files.item(0)

    if (!file) {
      return
    }

    const arrayBuffer = await file.arrayBuffer()

    const workbook = read(arrayBuffer)

    if (!workbook.SheetNames[0]) {
      return
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!sheet) {
      return
    }

    interface Row { [key: string]: string | number | Date }

    const json = utils.sheet_to_json(sheet) as Row[]

    const parsedJson: Configuration[] = []

    function fuzzyKey(row: Row, keys: string[]) {
      const key = Object.keys(row).find((key) => {
        const normalKey = key.toLowerCase().replaceAll(/[ _().]/g, '')
        return keys.includes(normalKey)
      })
      if (key) {
        return String(row[key])
      }
    }

    for (const row of json) {
      try {
        let sFurnitureLatitude
        let sFurnitureLongitude
        const sFurnitureLocation = fuzzyKey(row, ['sfurniturelocation'])
        if (typeof sFurnitureLocation === 'string') {
          const coords = sFurnitureLocation.split(',', 2)
          const latitude = Number(coords[0])
          const longitude = Number(coords[1])
          if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
            sFurnitureLatitude = latitude
            sFurnitureLongitude = longitude
          }
        }

        let radioIdFull
        let wmbusKey
        const assetConfig = fuzzyKey(row, ['config'])
        if (typeof assetConfig === 'string') {
          const config = assetConfig.split(',', 2)
          const id = config[0]?.trim().toUpperCase()
          const key = config[1]?.trim().toUpperCase()
          if (id && key) {
            radioIdFull = id
            wmbusKey = key
          }
        }

        const configuration = {
          sFurnitureId: fuzzyKey(row, ['sfurnitureid']),
          sFurnitureAddress: fuzzyKey(row, ['sfurnitureaddress']),
          sFurnitureLatitude,
          sFurnitureLongitude,
          sFurnitureW3W: fuzzyKey(row, ['sfurniturew3w']),
          assets: [
            {
              assetInfoId: fuzzyKey(row, ['assetinfoid']),
              coAssetId: fuzzyKey(row, ['coassetidsn', 'coassetid']),
              radioId: fuzzyKey(row, ['radioid']),
              radioIdFull,
              wmbusKey,
            },
          ],
        }

        if (Object.entries(configuration).find(([_, value]) => value === undefined)) {
          if (configuration.assets[0] && !Object.entries(configuration.assets[0]).find(([_, value]) => value === undefined)) {
            parsedJson[parsedJson.length - 1]?.assets.push(configuration.assets[0] as ConfigurationAsset)
          }
          else {
            console.warn('Skipping invalid row', row)
          }
          continue
        }

        parsedJson.push(configuration as Configuration)
      }
      catch (e) {
        console.error(e)
      }
    }

    availableConfigurations.value = parsedJson
    importedConfigurations.value = parsedJson
    appliedConfigurations.value = []
    filename.value = file.name
  })

  return { openFile, availableConfigurations, filename, clearConfig, applyConfiguration, appliedConfigurations, importedConfigurations }
}
