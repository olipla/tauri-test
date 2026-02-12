export enum Runmode {
  HIBERNATE = 0,
  CONFIG = 1,
  PRE_RUN = 2,
  NORMAL = 3,
  TEST = 4,
  CONTINUOUS_TEST = 5,
}

export interface MeterConfig {
  id: string
  key: string
}

export interface DeviceMetadata {
  deviceId: string | undefined
  deviceAltId: string | undefined
  versionLong: string | undefined
  versionTag: string | undefined
  versionShort: string | undefined
  LPWANModemType: string | undefined
}

export interface DeviceConfiguration {
  stackMode: string | undefined
  meterType: string | undefined
  meters: Map<number, MeterConfig>
  time: number | undefined
  listeningStart: number | undefined
  listeningCycle: number | undefined
  listeningDuration: number | undefined
}

export interface DeviceState {
  runmode: string | undefined
  mbusEnabled: boolean
  transmitting: null | string
  needsFlash: boolean
  lastQueryAttempt: number
  lastConfigAttempt: number
  lastConfigInnerAttempt: number
}

export interface DeviceRegexs {
  [key: string]: {
    regex: RegExp
    onMatch: (str: string, match: RegExpExecArray) => (void | Promise<void>)
  }
}
