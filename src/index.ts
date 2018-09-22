import * as router from './router'
import { Loading } from './service/plugins/Loading'
import { Logging } from './service/plugins/Logging'
import { Tools } from './service/plugins/Tools'

const plugins = { Loading, Logging, Tools }

export * from './service/core'
export * from './service/ServiceStore'
export { router, plugins }
