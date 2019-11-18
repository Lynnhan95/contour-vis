import React, { Component } from "react"
import './App.css';
import { csv } from 'd3'
import BaseMap from './components/map'


class App extends Component {
  constructor(){
    super()
    this.state = {
    }
  }

  componentDidMount(){
    // csv('/religious_data.csv').then( data => {
    //   //string to number
    //   data.forEach( (d) => {
    //     d["id"] = +d["id"];
    //     d["Latitude"] = +d["Latitude"]
    //     d["Longitude"] = +d["Longitude"]
    //     d["year"] = +d["year"]
    //   })
    //   return data

    // }).then( data => {
    //   const ZhejiangData = data.filter( (d) => {
    //     return d.province == "Zhejiang"
    //   })
    //   this.setState({Zhejiang: ZhejiangData})

    // })
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
