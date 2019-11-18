import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv } from 'd3'

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            chinaGeoData: [],
            ZhejiangData:[]
        }
    }
    // projection function with empirical params
    projection() {
        return geoMercator().scale(500).center([110,36])
    }

    // when component mounted, fetch geojson data locally
    componentDidMount() {
        fetch("/chinaGeo.geojson")
        .then(response => {
            if (response.status !== 200){
                console.log('can not load geojson file')
                return
            }
            response.json().then(chinaGeoData => {
                this.setState ({
                    chinaGeoData:  chinaGeoData.features
                })
            })
        })

        csv('/religious_data.csv').then( data => {
            //string to number
            data.forEach( (d) => {
              d["id"] = +d["id"];
              d["Latitude"] = +d["Latitude"]
              d["Longitude"] = +d["Longitude"]
              d["year"] = +d["year"]
            })
            return data
      
          }).then( data => {
            const ZhejiangData = data.filter( (d) => {
              return d.province == "Zhejiang"
            })
            this.setState({ZhejiangData: ZhejiangData})
      
          })

    }

    render() {
        console.log(this.state.ZhejiangData)
        // define province shapes with chinaGeoData
        const Regions = this.state.chinaGeoData.map((d, i) => {
            return (
            <path
            key = {`path-${ i }`}
            d = { geoPath().projection(this.projection())(d) }
            stroke = "#fff"
            strokeWidth = "0.2"
            file = "#E7E7E7"
            />
            )
        })

        // draw circles to the map
        const Dots = this.state.ZhejiangData.map((d,i) => {
            // console.log(this.projection()([ d.Longitude, d.Latitude ]))
            return (
            <circle 
            key = {`dot-${ i }`}
            cx = { this.projection()([ d.Longitude, d.Latitude ])[0]}
            cy = { this.projection()([ d.Longitude, d.Latitude ])[1]}
            fill="red"
            r = "0.1"
            />
            )
        })
        return (
        <div>
            <p>Basemap</p>
            <svg width = "960" height = "600" viewBox = '0 0 960 600'>
            <g className="Regions">
                {Regions}
            </g>
             <g className="Dots"> 
                {Dots}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;