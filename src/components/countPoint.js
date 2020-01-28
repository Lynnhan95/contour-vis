import inside from 'point-in-polygon'

function CountPoint(region, pointsData) {
    // region -> mainArea[0]
    const polygon = JSON.parse(JSON.stringify(region[0]))
    //polygon.pop()
    const points = pointsData.map((d) => {
        return [d.Longitude, d.Latitude]
    })

    let count = 0 
    for(let i=0; i< points.length; i++) {
        let temp = inside(points[i], polygon)
        if (temp) {
            count += 1
        }else {
            console.log(points[i], false)
        }
    }
    return count
}

export default CountPoint