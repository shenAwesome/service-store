
import * as router from './router'
import { Loading } from './service/plugins/Loading'
import { Logging } from './service/plugins/Logging'
const plugins = { Loading, Logging }

export * from './service/core'
export * from './service/ServiceStore'
export { router, plugins } 