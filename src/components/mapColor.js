import React from "react"

function MapColor(region, index, projection, color, name) {
    // region -> dots coordinate along region
    let temp = JSON.parse(JSON.stringify(region))
    // temp.push(this.state.even_points[0])
    let geoObj = {
        type: "Feature",
        "properties": {
            id: "43",
            name: "hunan",
            latitude: 27.6667,
            longtitude:111.712
        },
        "geometry": {
            type: "Polygon",
            coordinates: [temp]
        }
    }
    console.log(geoObj)
    return <path
    key = {`${ name }-path-${ index }`}
    d = {projection(geoObj)}
    stroke = "#fff"
    strokeWidth = "0.2"
    fill = { color }
    /> 
}

export default MapColor