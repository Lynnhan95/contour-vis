import React, { Component } from "react"
import './App.css';
import BaseMap from './components/map'


class App extends Component {
  constructor(){
    super()
    this.state = {
    }
  }

  componentDidMount(){

  }

  render(){
    return (
      <div className="App">
        <BaseMap></BaseMap>
      </div>
    );
  }

}

export default App;
