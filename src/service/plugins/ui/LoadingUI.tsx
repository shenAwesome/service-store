import * as React from 'react';
import { Loading } from '../Loading'
import { ServiceStore } from '../../ServiceStore'
import './LoadingUI.scss'

class LoadingUI extends React.PureComponent {
    public render() {
        const { isLoading } = this.props as any
        return <>
            {isLoading ? <div className='loader-wrapper'>
                <div className='loader'></div>
            </div> : null}
        </>
    }
}

function createUI(store: ServiceStore<any>) {
    const { connect } = store,
        modelId = store.getModelIdByClass(Loading)
    const Cls = connect(s => {
        const model = (s[modelId] as Loading)
        const isLoading = (model.brokerSessionCount == 0) && (model.count() > 0)
        return { isLoading }
    })(LoadingUI)
    return Cls
}

export { createUI }