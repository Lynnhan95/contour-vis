import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv } from 'd3'
import { findMats, traverseEdges } from 'flo-mat'
import Offset from 'polygon-offset'

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            chinaGeoData: [],
            ZhejiangData:[],
            resDots: null
        }

        this.autoProjection = null
        this.svg_w = 960
        this.svg_h = 600

        // offset
        this.offset = new Offset()
        this.offsetPadding = -0.2

    }

    // projection function with empirical params
    projection() {
        return geoMercator().scale(500).center([110,36])
    }

    // helper functions for mathmatical computation
    /*
     * helper funcs can be defined in the class, make code clearer
     */
    constructList(list) {
        var res = [[]] 
        // list[0] = [x, y]
        for (var i =0; i< list.length; i++) {
            if (i< list.length-1) {
                var prev = list[i]
                var next = list[i+1]
                res[0].push([prev, next])
            }else {
                var prev = list[i]
                res[0].push([prev, list[0]])
            }

        }
        return res
    }

    // draw paths - helper functions
    getLinePathStr(ps) {
        let [[x0,y0],[x1,y1]] = ps;
        return `M${x0} ${y0} L${x1} ${y1}`;
    }

    getQuadBezierPathStr(ps) {
        let [[x0,y0],[x1,y1],[x2,y2]] = ps;
        return `M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}`;
    }

    getCubicBezierPathStr(ps) {
        let [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] = ps;
        return `M${x0} ${y0} C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
    }

    // when component will mount, fetch geojson and csv data locally
    componentWillMount(){
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
                    chinaGeoData:  chinaGeoData.features,
                    outerBoundary: chinaGeoData.features[27].geometry.coordinates[9]
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



    componentDidUpdate(prevPros, prevState){
        let _me = this

        if(prevState.outerBoundary !== this.state.outerBoundary) {
        // store computed dots and paths 
        let resDots = [];
        const resPaths = []
        // loops data format
        let testloop = [
        [
            [[50.000, 95.000],[92.797, 63.905]], 
            [[92.797, 63.905],[76.450, 13.594]],
            [[76.450, 13.594],[23.549, 13.594]],
            [[23.549, 13.594],[7.202, 63.90]],
            [[7.202,  63.900],[50.000, 95.000]]
        ]
        ];
        let resloop = this.constructList(this.state.outerBoundary[0])

        let mats = findMats(resloop, 1);

        //traverse
        mats.forEach(f)
        function f(mat){
            let cpNode = mat.cpNode
            if(!cpNode) { return; }
            // let bezier = cpNode.matCurveToNextVertex
            traverseEdges(cpNode, function(cpNode){
                if (cpNode.isTerminating()) { return ;}
                let bezier = cpNode.matCurveToNextVertex.map(e=>{
                    return _me.autoProjection(e)
                })
                if(!bezier) { return; }
                resDots.push(bezier)

                if(bezier.length == 2){
                    resPaths.push(_me.getLinePathStr(bezier))
                }else if(bezier.length == 3){
                    resPaths.push(_me.getQuadBezierPathStr(bezier))
                }else if(bezier.length == 4){
                    resPaths.push(_me.getCubicBezierPathStr(bezier))
                }
            })
        }

        this.setState({
            resPaths: resPaths
        })

        this.state.chinaGeoData.map((d,i) => {
            if (d.properties.name === '浙江'){
                // compute interpolate  interpolate array with original boundary array
                let mainArea = d.geometry.coordinates[9]
                console.log(mainArea )
                let interpolateArr = []
                let interpolateNum = 3

                function getInterpolate(arr) {
                    arr.forEach(e=>{   
                        for(let i=0; i< e.length -1; i++) {
                            let prev = e[i]
                            let next = e[i+1]
                            let thetaX = ( next[0] - prev[0] ) 
                            let thetaY = ( next[1] - prev[1] )
                            for(let j=1; j<= interpolateNum; j++ ) {
                                let cur = []
                                cur[0] = prev[0] + ( j / interpolateNum ) * thetaX 
                                cur[1] = prev[1] + ( j / interpolateNum ) * thetaY
                                interpolateArr.push(cur)
                            }
                        }
                    })
                }
                getInterpolate(mainArea)


                let MedianVerticalPoints = []
                function getMedialVertical(arr) {
                    for (let i = 0; i < arr.length - 1; i++) {
                        let prev = arr[i]
                        let next = arr[i + 1]
                        let thetaX = (next[0] - prev[0])
                        let thetaY = (next[1] - prev[1])
                        let theta_Virtical = thetaX / thetaY
                        let extend = 0.3
                        let median = [[(next[0] + prev[0]) / 2 - extend, (next[1] + prev[1]) / 2 + extend * theta_Virtical], [(next[0] + prev[0]) / 2 + extend, (next[1] + prev[1]) / 2 - extend * theta_Virtical] ]
                        
                        MedianVerticalPoints.push(median)
                    }
                }
                getMedialVertical(interpolateArr)
                console.log(MedianVerticalPoints)


                let MedialVerticalPaths = []
                function getPathsfromPoints(arr) {
                    for (let i=0; i< arr.length-1; i++) {
                        let x0 = _me.autoProjection(arr[i][0])[0], y0 = _me.autoProjection(arr[i][0])[1]
                        let x1 = _me.autoProjection(arr[i][1])[0], y1 = _me.autoProjection(arr[i][1])[1]
                        MedialVerticalPaths.push(`M${x0} ${y0} L${x1} ${y1}`);
                    }
                }
                getPathsfromPoints(MedianVerticalPoints)


                this.setState({
                    interpolateArr: interpolateArr,
                    MedialVerticalPaths: MedialVerticalPaths
                })
            }
        })


        }

        //compute for medial vertical 
       
    }



    render() {
        // define province shapes with chinaGeoData
        const Regions = this.state.chinaGeoData.map((d, i) => {
            /**
             * only render zhejiang for showing more detail
             */
            if(d.properties.name === '浙江'){
                // no smooth boundary anymore, because that increase complexity for now

                let verticalLines
                
                if ( this.state.MedialVerticalPaths ) {
                    console.log(' this.MedialVerticalPaths' )
                    verticalLines = this.state.MedialVerticalPaths.map((d,i) => {

                            return (
                                <path 
                                d = {d}
                                stroke = "#000"
                                strokeWidth = "0.5"
                                />
                            )
                        })
                }

                let boundaryDots
                if ( this.state.interpolateArr ) {

                    boundaryDots = this.state.interpolateArr.map((d, i) => {
                        return(
                            <circle
                            key = {`boundaryDot-${i}`}
                            r = "1"
                            fill = "red"
                            cx = {this.autoProjection(d)[0] }
                            cy = {this.autoProjection(d)[1] }
                            />
                        )
                    
  
                })
                }

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
                    />
                
                return [
                    outsideBoundary, 
                    innerBoundary,
                    boundaryDots,
                    verticalLines

                ]
            }
            
        })

        //draw medial axis to the map
        let MedialAxis
        if( this.state.resPaths) {
           MedialAxis = <path
                key = {`medial-121212`}
                d = { this.state.resPaths.join(' ')}
                stroke = "#000"
                />
        }

        // draw dots to the map 
        const Dots = this.state.ZhejiangData.map((d,i) => {
            return (
            <circle 
            key = {`dot-${ i }`}
            cx = { this.autoProjection([ d.Longitude, d.Latitude ])[0]}
            cy = { this.autoProjection([ d.Longitude, d.Latitude ])[1]}
            fill="purple"
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
            <g className="MedialAxis"> 
                {MedialAxis}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;