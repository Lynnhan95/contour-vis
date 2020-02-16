import _ from 'lodash';
import h337 from 'heatmap.js';
import ReactDOM, { render } from 'react-dom';
import React, {Component, PropTypes} from 'react';

class ReactHeatmap extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = { cfg: null };
  }

  componentDidMount(){
    const { style, data, config } = this.props;
    let c = config || {};
    let _container = ReactDOM.findDOMNode(this);
    let defaultCfg = {
      width: style.width.replace('px','') || _container.offsetWidth,
      height: style.height.replace('px','') || _container.offsetHeight,
    };
    let _cfg = _.merge( defaultCfg, c );
    _cfg.container = _container;
    this.heatmapInstance = h337.create( _cfg );
    this.setState({ cfg: _cfg });
    this.heatmapInstance.setData( data );
  }

  componentWillReceiveProps(nextProps){
    return nextProps != this.props;
  }

  shouldComponentUpdate(nextProps){
    return nextProps != this.props;
  }

  render(){

    return (
      <div ref="react-heatmap"></div>
    );

  }

}

export default ReactHeatmap;