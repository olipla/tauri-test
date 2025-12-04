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
  imported: Date
  source: string | undefined
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

export function useConfigurationDatabase() {
  const db = new Dexie('ConfigurationDatabase') as Dexie & {
    configuration: EntityTable<DBConfiguration, 'id'>
    configuredDevice: EntityTable<DBConfiguredDevice, 'id'>
  }

  db.version(1).stores({
    configuration: '++id, available, imported, &sFurnitureId, sFurnitureAddress, sFurnitureLatitude, sFurnitureLongitude, sFurnitureW3W, assets',
    configuredDevice: '++id, timestamp, configurationId, deviceId, deviceAltId, versionLong, versionTag, versionShort, LPWANModemType',
  })

  async function addConfiguration(configuration: Configuration, source?: string) {
    const date = new Date()
    await db.configuration.add({ ...configuration, imported: date, source, available: 1 })
  }

  async function addConfigurations(configurations: Configuration[], source?: string) {
    const date = new Date()
    const dbConfigurations = configurations.map((x) => {
      return { ...x, imported: date, source, available: 1 }
    })
    await db.configuration.bulkAdd(dbConfigurations)
  }

  async function addConfiguredDevice(device: ConfiguredDevice, configurationId: number) {
    const timestamp = new Date()
    await db.configuredDevice.add({ ...device, configurationId, timestamp })
  }

  async function applyConfiguration(configurationId: number, configuredDevice: ConfiguredDevice) {
    db.configuration.update(configurationId, { available: 0 })
    addConfiguredDevice(configuredDevice, configurationId)
  }

  async function getAllConfigurations() {
    return db.configuration.toArray()
  }

  async function getUnusedConfigurations() {
    const usedConfigurationIds = (await db.configuredDevice.toArray()).map(x => x.configurationId)
    return db.configuration.where('id').noneOf(usedConfigurationIds).toArray()
  }

  async function getAvailableConfigurations() {
    return db.configuration.where('available').aboveOrEqual(1).toArray()
  }

  async function getConfiguredDevices() {
    return db.configuredDevice.toArray()
  }

  async function getConfiguredDevicesWithConfiguration(): Promise<(DBConfiguredDevice & DBConfiguration)[]> {
    const configuredDevices = await db.configuredDevice.toArray()

    return (await Promise.all(
      configuredDevices.map(async (device) => {
        const configuration = await db.configuration.get(device.configurationId)
        if (!configuration) {
          return
        }

        return { ...device, ...configuration }
      }),
    )).filter(x => x !== undefined)
  }

  return { db, addConfiguration, addConfigurations, addConfiguredDevice, getAllConfigurations, getUnusedConfigurations, getConfiguredDevices, getConfiguredDevicesWithConfiguration, getAvailableConfigurations, applyConfiguration }
}
