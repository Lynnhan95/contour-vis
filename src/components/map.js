import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
// import { scaleSqrt } from 'd3-scale'
import { feature } from "topojson-client"
// import { Popover } from 'antd'

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            baseMap: []
        }
    }
    // projection function 
    projection() {
        return geoMercator()
               .scale(800)
               .center([-98.5795, 39.8283])
    }

    // when component mounted, fetch geojson data locally
    componentDidMount() {
        fetch("/us-states.json")
        .then(response => {
            if (response.status !== 200){
                console.log('can not load geojson file')
                return
            }
            response.json().then(baseMap => {
                console.log(baseMap)
                this.setState ({
                    baseMap:  feature(baseMap, baseMap.objects.states).features,
                })
            })
        })

    }

    render() {
        const region = this.state.baseMap.map((d, i) => {
            return (
            <path
            key = {`path-${ i }`}
            d = { geoPath().projection(this.projection())(d) }
            stroke = "#fff"
            file = "#E7E7E7"
            />
            )

        })
        return (
        <div>
            <p>Basemap</p>
            <svg width="1000" height = "520">
            <g>
                {region}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;