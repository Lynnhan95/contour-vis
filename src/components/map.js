import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv } from 'd3'
import smooth from 'smooth-polyline'

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            chinaGeoData: [],
            ZhejiangData:[]
        }

        this.autoProjection = null
        this.svg_w = 960
        this.svg_h = 600
    }
    // projection function with empirical params
    projection() {
        return geoMercator().scale(500).center([110,36])
    }

    // when component mounted, fetch geojson data locally
    componentDidMount() {
        let _me = this

        fetch("/chinaGeo.geojson")
        .then(response => {
            if (response.status !== 200){
                console.log('can not load geojson file')
                return
            }
            response.json().then(chinaGeoData => {
                console.log('chinaGeoData', chinaGeoData)
                this.autoProjection = geoMercator().fitSize([_me.svg_w, _me.svg_h], chinaGeoData)
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
        // console.log(this.state.ZhejiangData)
        
        // define province shapes with chinaGeoData
        const Regions = this.state.chinaGeoData.map((d, i) => {
            /**
             * only render zhejiang for showing more detail
             */
            if(d.properties.name === '浙江'){
                // d.geometry.coordinates[0] = smooth(d.geometry.coordinates[0])
                // console.log('smooth', d.geometry.coordinates)
                d.geometry.coordinates.forEach(e=>{
                    e[0] = smooth(e[0])
                })

                return (
                    <path
                    key = {`path-${ i }`}
                    d = { geoPath().projection(this.autoProjection.fitSize([this.svg_w, this.svg_h], d))(d) }
                    stroke = "#fff"
                    strokeWidth = "0.2"
                    file = "#E7E7E7"
                    />
                )
            }

            
        })

        // draw circles to the map
        const Dots = this.state.ZhejiangData.map((d,i) => {
            // console.log(this.projection()([ d.Longitude, d.Latitude ]))
            return (
            <circle 
            key = {`dot-${ i }`}
            cx = { this.autoProjection([ d.Longitude, d.Latitude ])[0]}
            cy = { this.autoProjection([ d.Longitude, d.Latitude ])[1]}
            fill="red"
            r = "0.1"
            />
            )
        })
        return (
        <div>
            <p>Basemap</p>
            <svg width = {this.svg_w} height = {this.svg_h} viewBox = {`0 0 ${this.svg_w} ${this.svg_h}`}>
            <g className="Regions">
                {Regions}
            </g>
             <g className="Dots"> 
                {/* {Dots} */}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;