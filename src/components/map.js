import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv } from 'd3'
import smooth from 'smooth-polyline'
import Offset from 'polygon-offset'

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

        // offset
        this.offset = new Offset()
        this.offsetPadding = -0.1
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

                // smooth boundary
                d.geometry.coordinates.forEach(e=>{
                    e[0] = smooth(e[0])
                })

                // reset projection
                this.autoProjection.fitSize([this.svg_w, this.svg_h], d)

                let outsideBoundary = <path
                    key = {`path-${ i }`}
                    d = { geoPath().projection(this.autoProjection)(d) }
                    stroke = "#fff"
                    strokeWidth = "0.2"
                    fill = "#2c75b1"
                    />

                // offset boundary
                let offsetCoordinates = d.geometry.coordinates.map(e=>{
                    try {
                        let temp = new Offset(e).offset(this.offsetPadding)

                        return temp
                    } catch (error) {
                        return null
                    }
                })

                let innerBoundaryCoordinates = offsetCoordinates.filter(e => !!e)

                // let res = this.offset.data(innerBoundaryCoordinates).padding(this.offsetPadding)
                console.log('innerBoundaryCoordinates', innerBoundaryCoordinates)
                let paddinged = {
                    type: 'Feature',
                    properties: {
                        id: "33-1",
                        latitude: 29.1084,
                        longitude: 119.97,
                        name: "浙江"
                    },  
                    geometry: {
                      type: 'MultiPolygon',
                      coordinates: innerBoundaryCoordinates
                    }
                }
                
                let innerBoundary = <path
                    key = {`path-${ ++i }`}
                    d = { geoPath().projection(this.autoProjection)(paddinged) }
                    stroke = "#fff"
                    strokeWidth = "0.2"
                    fill = "#edc949"
                    // fillOpacity="0.5"
                    />

                return [
                    outsideBoundary, 
                    innerBoundary
                ]
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
            r = "1"
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
                {Dots}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;