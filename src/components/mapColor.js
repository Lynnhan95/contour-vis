import React from "react"

function MapColor(region, index, projection, color, name) {
    // region -> dots coordinate along region
    return <path
    key = {`${ name }-path-${ index }`}
    d = {projection(region)}
    stroke = "#fff"
    strokeWidth = "0.2"
    fill = { color }
    /> 
}

export default MapColor