import inside from 'point-in-polygon'

function CountPoint(region, pointsData) {
    // region -> mainArea[0]
    const polygon = JSON.parse(JSON.stringify(region))
    //polygon.pop()
    const points = pointsData.map((d) => {
        return [d.Longitude, d.Latitude]
    })

    let count = 0 
    for(let i=0; i< points.length; i++) {
        let res = inside(points[i], polygon)
        if (res) {
            count += 1
        }else {
            // console.log(points[i], false)
            
        }
    }
    return count
}

export default CountPoint