import type { EntityTable } from 'dexie'
import { Dexie } from 'dexie'

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

export interface DBConfiguration extends Configuration {
  id: number
  sourceId: number
  available: number
}

export interface ConfiguredDevice {
  deviceId: string
  deviceAltId: string
  versionLong: string
  versionTag: string
  versionShort: string
  LPWANModemType: string
}

export interface DBConfiguredDevice extends ConfiguredDevice {
  id: number
  timestamp: Date
  configurationId: number
}

export interface Source {
  timestamp: Date
  type: string
  name: string
}

export interface DBSource extends Source {
  id: number
}

export interface DeviceHistory {
  start: number
  deviceId: string
  history: string[]
}

export interface DBDeviceHistory extends DeviceHistory {
  id: number
}

export function useConfigurationDatabase() {
  const db = new Dexie('ConfigurationDatabase') as Dexie & {
    configuration: EntityTable<DBConfiguration, 'id'>
    configuredDevice: EntityTable<DBConfiguredDevice, 'id'>
    source: EntityTable<DBSource, 'id'>
    deviceHistory: EntityTable<DBDeviceHistory, 'id'>
  }

  db.version(1).stores({
    configuration: '++id, available, sourceId, &sFurnitureId, sFurnitureAddress, sFurnitureLatitude, sFurnitureLongitude, sFurnitureW3W, assets',
    configuredDevice: '++id, timestamp, configurationId, deviceId, deviceAltId, versionLong, versionTag, versionShort, LPWANModemType',
    source: '++id, timestamp, type, name',
    deviceHistory: '++id, [start+deviceId], history',
  })

  async function upsertHistory(start: Date | number, deviceId: string, history: string | string[]) {
    const startEpoch = typeof start === 'number' ? start : start.getTime()

    const historyLines = []
    if (typeof history === 'string') {
      historyLines.push(history)
    }
    else {
      historyLines.push(...history)
    }

    console.log('UPSERT HISTORY LINES', historyLines)

    // console.log(await db.deviceHistory.toArray())

    const allExistingHistory = await db.deviceHistory.where({ start: startEpoch, deviceId }).toArray()
    const existingHistory = allExistingHistory[0]

    const pendingIds = allExistingHistory.map(x => x.id).slice(1)

    db.deviceHistory.bulkDelete(pendingIds)

    console.log('UPSERT EXISTING HISTORY', existingHistory)
    if (existingHistory === undefined) {
      await db.deviceHistory.put({ start: startEpoch, deviceId, history: historyLines })
    }
    else {
      const pendingHistory = allExistingHistory.flatMap(x => x.history)

      await db.deviceHistory.update(existingHistory.id, { history: [...pendingHistory, ...historyLines] })
    }
  }

  async function addConfiguration(configuration: Configuration, sourceType: string, sourceName: string) {
    const timestamp = new Date()
    const sourceId = await db.source.add({ timestamp, type: sourceType, name: sourceName })
    await db.configuration.add({ ...configuration, sourceId, available: 1 })
    return sourceId
  }

  async function addConfigurations(configurations: Configuration[], sourceType: string, sourceName: string) {
    const timestamp = new Date()
    const sourceId = await db.source.add({ timestamp, type: sourceType, name: sourceName })
    const dbConfigurations = configurations.map((x) => {
      return { ...x, sourceId, available: 1 }
    })
    await db.configuration.bulkAdd(dbConfigurations)
    return sourceId
  }

  async function addConfiguredDevice(device: ConfiguredDevice, configurationId: number) {
    const timestamp = new Date()
    await db.configuredDevice.add({ ...device, configurationId, timestamp })
  }

  async function applyConfiguration(configurationId: number, configuredDevice: ConfiguredDevice) {
    db.configuration.update(configurationId, { available: 0 })
    addConfiguredDevice(configuredDevice, configurationId)
  }

  async function getAllConfigurations(sourceId?: number) {
    if (sourceId !== undefined) {
      return db.configuration.where('sourceId').equals(sourceId).toArray()
    }
    else {
      return db.configuration.toArray()
    }
  }

  async function getUnusedConfigurations() {
    const usedConfigurationIds = (await db.configuredDevice.toArray()).map(x => x.configurationId)
    return db.configuration.where('id').noneOf(usedConfigurationIds).toArray()
  }

  async function getAvailableConfigurations(sourceId?: number) {
    if (sourceId !== undefined) {
      return db.configuration.where({ available: 1, sourceId }).toArray()
    }
    else {
      return db.configuration.where('available').aboveOrEqual(1).toArray()
    }
  }

  async function getConfiguredDevices() {
    return db.configuredDevice.toArray()
  }

  async function getConfiguredDevicesWithConfiguration(sourceId?: number): Promise<(DBConfiguredDevice & DBConfiguration)[]> {
    const configuredDevices = await db.configuredDevice.toArray()

    const result = await Promise.all(
      configuredDevices.map(async (device) => {
        const configuration = await db.configuration.get(device.configurationId)
        if (!configuration) {
          return
        }

        return { ...device, ...configuration }
      }),
    )

    if (sourceId !== undefined) {
      return result.filter((x): x is DBConfiguredDevice & DBConfiguration => x !== undefined && x.sourceId === sourceId)
    }
    else {
      return result.filter((x): x is DBConfiguredDevice & DBConfiguration => x !== undefined)
    }
  }

  async function getSources(): Promise<DBSource[]> {
    return db.source.toArray()
  }

  async function getSource(id: number): Promise<DBSource | undefined> {
    return db.source.get(id)
  }

  return {
    db,
    addConfiguration,
    addConfigurations,
    addConfiguredDevice,
    getAllConfigurations,
    getUnusedConfigurations,
    getConfiguredDevices,
    getConfiguredDevicesWithConfiguration,
    getAvailableConfigurations,
    applyConfiguration,
    getSources,
    getSource,
    upsertHistory,
  }
}
