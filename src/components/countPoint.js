import React, { Component } from 'react'
import inside from 'point-in-polygon'

class CountPoint extends Component {
    constructor() {
        super()

    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.mainArea !== this.props.mainArea) {
            //let polygon = [ [ 1, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ]
            const polygon = JSON.parse(JSON.stringify(this.props.mainArea[0]))
            polygon.pop()
            this.setState({polygon: polygon})

        }
        if (prevProps.points !== this.props.points) {
            // let point = [0, 0]
            const points = this.props.points.map((d) => {
                return [d.Longitude, d.Latitude]
            })

            let count = 0
            for(let point in points) {
                let temp = inside(point, this.state.polygon)
                if (temp) {
                    count += 1
                }
            }
            console.log(count)
        }

    }
    render(){
        return (
            <div>

            </div>
        )
    }
}

export default CountPoint