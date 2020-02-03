import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, scaleSequential, interpolateOrRd } from 'd3'
import { findMats, traverseEdges, getPathsFromStr, Mat, toScaleAxis } from 'flo-mat'
import Offset from 'polygon-offset'
import simplify from 'simplify-js'
import paper from 'paper'
import CountPoint from './countPoint'
import MapColor from './mapColor'
import polygonClipping from 'polygon-clipping'
import { polygonContains } from 'd3-polygon'

const intersect = require('path-intersection')

// console.log('paper', paper)

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            chinaGeoData: [],
            pointsData:[],
            resDots: null,
            segment_path_len: 0.1,
            simplifiedContours: null,

            segmentBoxObjArray: null
        }

        this.autoProjection = null
        this.svg_w = 960
        this.svg_h = 600

        // offset
        this.offset = new Offset()
        this.innerBoundaryCoordinates = null

        // segment
        this.segmentBoxObjArray = []
    }

    // projection function with empirical params
    projection() {
        return geoMercator().scale(500).center([110,36])
    }

    /* when component will mount, fetch geojson and csv data locally */
    componentDidMount(){
        let _me = this

        paper.setup('myCanvas')

        /* Fetching Geo-boundary data from geojson file */
        fetch("/chinaGeo.geojson")
            .then(response => {
                if (response.status !== 200){
                    console.log('can not load geojson file')
                    return
                }
                response.json().then(chinaGeoData => {
                    this.autoProjection = geoMercator().fitSize([_me.svg_w, _me.svg_h], chinaGeoData)
                    this.setState ({
                        chinaGeoData:  chinaGeoData.features                    })
                })
            })

        csv('/religious_data.csv').then( data => {
            // Converting certain csv data from string to number
            data.forEach( (d) => {
              d["id"] = +d["id"];
              d["Latitude"] = +d["Latitude"]
              d["Longitude"] = +d["Longitude"]
              d["year"] = +d["year"]
            })
            return data
      
            }).then( data => {
                const pointsData = data.filter( (d) => {
                    return d.province === "Hunan"
                })
                this.setState({pointsData: pointsData})
            })
    }
    /* Helper function for getting even_point */
    calcDistanceFromTwoPoints(point1, point2) {
        let [x0, y0] = point1,
            [x1, y1] = point2

        return Math.sqrt((x0 - x1)*(x0 - x1) + (y0 - y1)*(y0 - y1))
    }

    getEvenPointsFromCoordinates(coordinates, segment_len) {
        let _me = this,
            total_len = coordinates.length,
            remain_len = 0,
            result = []

        coordinates.forEach((e, i)=>{
            let curr_point, next_point

            if(i === total_len - 1){
                curr_point = coordinates[total_len - 1]
                next_point = coordinates[0]
            }else{
                curr_point = coordinates[i]
                next_point = coordinates[++i]
            }

            let dis = _me.calcDistanceFromTwoPoints(curr_point, next_point),
                curr_len = remain_len + dis

            if(curr_len < segment_len){
                remain_len += dis
            }else{
                let start_len = segment_len - remain_len,
                    point_num = Math.floor(curr_len / segment_len),
                    thetaX = next_point[0] - curr_point[0],
                    thetaY = next_point[1] - curr_point[1]

                for (let i = 0; i < point_num; i++) {
                    let temp = []

                    temp[0] = curr_point[0] + (start_len + i * segment_len) / dis * thetaX
                    temp[1] = curr_point[1] + (start_len + i * segment_len) / dis * thetaY

                    result.push(temp)
                }

                remain_len = curr_len - segment_len * point_num
            }
        })

        return result
    }


    // getPerpendicularYfromX(A, B, x){ // A, B are line end points
    //     let k = (B.x-A.x)/(B.y-A.y)

    //     return -1*k*x + k*(A.x+B.x)/2 + (A.y+B.y)/2
    // }

    // getPerpendicularXfromAB(A, B, len) {
    //     let M = {
    //             x: (B.x + A.x) / 2
    //         },
    //         k = (B.x-A.x)/(B.y-A.y),
    //         x = {
    //             pos: null,
    //             neg: null
    //         }
        
    //     x.pos = M.x + len/Math.sqrt(k*k + 1)
    //     x.neg = M.x - len/Math.sqrt(k*k + 1)

    //     return x
    // }

    getMedianPointsFromEvenPoint(arr) {
        let _me = this
        let MedianPoints = [],
        A, B 

        for (let i = 0; i< arr.length; i++) {
            if(i === arr.length - 1){
                A = {
                    x: arr[arr.length-1][0],
                    y: arr[arr.length-1][1]
                }
                B = {
                    x: arr[0][0],
                    y: arr[0][1]
                }
            }else{
                A = {
                    x: arr[i][0],
                    y: arr[i][1]
                }
                B = {
                    x: arr[i+1][0],
                    y: arr[i+1][1]
                }
            }

            let M = {
                x: (B.x + A.x) / 2,
                y: (B.y + A.y) / 2
            }

            let median = _me.autoProjection([M.x, M.y])
            //console.log(median)
                MedianPoints.push(median)
        }
        return MedianPoints

    }

    getPathsfromPoints(arr) {
        let _me = this,
            paths = []

        for (let i=0; i< arr.length; i++) {
            // TODO: some points will lost after projection because
            // they are a little large
            let x0 = _me.autoProjection(arr[i][0])[0], 
                y0 = _me.autoProjection(arr[i][0])[1]
            let x1 = _me.autoProjection(arr[i][1])[0], 
                y1 = _me.autoProjection(arr[i][1])[1]

            paths.push(`M${x0} ${y0} L${x1} ${y1}`);
            
        }

        return paths
    }


    getInnerBoundaryContours(coordinates, num) {        

        let contours = []
        // HARDCODE 1.89: Api confusion 
        // let dist = 0.1/ (num) 
        for(let i=1; i< num+1 ; i++) {

            const padding = (-1.6/num)
            console.log(padding)
            let offsetContour = new Offset(coordinates).offset(padding* i)
            if (i == 1) {
                this.innerBoundaryCoordinates = offsetContour.filter(e => !!e)
            }

            let innerBoundaryCoordinates = offsetContour.filter(e => !!e)
    
            let paddinged = {
                type: 'Feature',
                properties: {
                },  
                geometry: {
                    type: 'Polygon',
                    coordinates: innerBoundaryCoordinates
                }
            }
            contours.push(paddinged)
        }
        
        return contours
    }

    getBoundarySegments(segments){
        let _me = this,
            temp_segments = [],
            clip_boundary

        clip_boundary = this.innerBoundaryCoordinates[0].map(e=>{
            return this.autoProjection(e)
        })

        segments.forEach((e, i)=>{
            e.push(e[0])

            let test = polygonClipping.difference([e], [clip_boundary])

            temp_segments.push(test[0][0])

            // push data
            let segmentBoxObj = {}
            segmentBoxObj.segmentCoor = e
            segmentBoxObj.boundarySegmentCoor = test[0][0]
            segmentBoxObj.dotCount = 0

            _me.segmentBoxObjArray.push(segmentBoxObj)
        })
        // console.log('_me.segmentBoxObjArray', _me.segmentBoxObjArray)
        return temp_segments
    }

    componentDidUpdate(prevPros, prevState){
        let _me = this

        if(prevState.chinaGeoData !== this.state.chinaGeoData) {

            this.state.chinaGeoData.map((d,i)=> {
            if (d.properties.name === '湖南'){
                // store computed dots and paths 
                const mainArea = d.geometry.coordinates
                const simplifiedFactor = 0
                
                // Compute simplified area
                let res = []
                for(let i=0; i< mainArea[0].length; i++) {
                    let temp = { }
                    temp['x'] = mainArea[0][i][0]
                    temp['y'] = mainArea[0][i][1]
                    res.push(temp)
                }

                let simplified = simplify(res, simplifiedFactor, true)
                let simplifiedArea = [] 
                for(let i=0; i< simplified.length; i++) {
                    let temp = [] 
                    temp.push(simplified[i].x)
                    temp.push(simplified[i].y)
                    simplifiedArea.push(temp)
                }
                
                _me.state.simplifiedArea = simplifiedArea
                _me.state.simplifiedContours = _me.getInnerBoundaryContours(simplifiedArea, 5)
                console.log('mainArea', _me.state.simplifiedContours)

                let even_points = _me.getEvenPointsFromCoordinates(simplifiedArea, 0.05)
                
                let MedianPoints = _me.getMedianPointsFromEvenPoint(even_points)
                // console.log(MedianPoints)

                // let MedianVerticalPoints = _me.getVerticalPathFromEvenPoint(even_points)
                //console.log(MedianVerticalPoints)
                
                // let MedialVerticalPaths = _me.getPathsfromPoints(MedianVerticalPoints)

                function getLinesfromPoints(arr) {
                    let lines = []

                    for (let i=0; i <= arr.length-1; i++) {
                        let x0 = arr[i][0][0],
                            y0 = arr[i][0][1],
                            x1 = arr[i][1][0],
                            y1 = arr[i][1][1]

                        lines.push(`M${x0} ${y0} L${x1} ${y1}`)
                    }
                    return lines
                }

                function getSecondElements(arr) {
                    let temp = [] 
                    for(let i=0; i< arr.length; i++) {
                        temp.push(arr[i][1])
                    }
                    return temp
                }
                
                // let segmentBorderPaths = getLinesfromPoints(segmentBorderPoints)
                // let segmentBorderPaths = getLinesfromPoints(nk_intersect_points[0])
                this.setState({
                    // interpolatePoints: interpolatePoints,
                    // SegmentPoints: SegmentPoints,
                   // MedialVerticalPaths: MedialVerticalPaths,
                    //rea: mainArea,
                    //simplifiedArea: simplifiedArea,
                    // resPaths: medialPath,
                    // segmentBorderPaths: segmentBorderPaths,
                    even_points: even_points,
                    MedianPoints: MedianPoints,
                    // paper_inter: nk_intersect_points[1],
                    //segments: segments,
                    //boundary_segments: boundary_segments
                })   
            }
            })
        }

        if (prevState.pointsData !== this.state.pointsData) {
            // console.log(this.state.even_points)
            console.log(CountPoint( this.state.even_points ,this.state.pointsData))

            this.state.pointsData.forEach(e=>{
                let point = _me.autoProjection([ e.Longitude, e.Latitude ])

                try {
                    _me.segmentBoxObjArray.forEach((e, i)=>{
                        let contain = polygonContains(e.segmentCoor, point)
                        // console.log(contain)
                        if(contain){
                            e.dotCount += 1
                            throw new Error('End')
                        }
                    })
                } catch (error) {}
            })

            let boundary_segment_extent = extent(_me.segmentBoxObjArray, (d)=>{
                return d.dotCount
            })
            this.color_scale = scaleSequential(interpolateOrRd).domain(boundary_segment_extent)
            console.log('boundary_segment_extent', this.color_scale(20))

            this.setState({
                segmentBoxObjArray: _me.segmentBoxObjArray
            })
        }

    }

    render() {
        // define province shapes with chinaGeoData
        let getRegionElements =() =>{
            let verticalLines
            if ( this.state.segmentBorderPaths ) {
                verticalLines = this.state.segmentBorderPaths.map((d,i) => {
                    return (
                        <path 
                        className = "vertical-line"
                        key = {`segmentBorder-${i}`}
                        d = {d}
                        stroke = "#000"
                        strokeWidth = "0.5"
                        />
                    )
                })
            }

            // let evenPoints
            // if(this.state.even_points) {
            //     evenPoints = this.state.even_points.map((d, i)=>{
            //         return(
            //             <circle
            //             key = {`evenPoints-${i}`}
            //             r = ".5"
            //             fill = "#33ff22"
            //             cx = {this.autoProjection(d)[0] }
            //             cy = {this.autoProjection(d)[1] }
            //             />
            //         )
            //     })
            // }


            function getLinePathStr(arr) {
                let path_str = []
                arr.forEach((e, i)=>{
                    if (i === 0) {
                        path_str.push(`M${e[0]} ${e[1]}`)
                    }else{
                        path_str.push(`L${e[0]} ${e[1]}`)
                    }
                })
                return path_str.join(' ')
            }

            /* Map segments and belt segments (denoted as boundary_segments) 
            With this.state.segments and this.state.segmentBoxObjArray data
            Notice: segmentBoxObjArray contains:
                    - boundarySegmentCoordinate 
                    - dotCount (dots amount per segment)
            */
            let segments
            if(this.state.segments) {
                segments = this.state.segments.map((d, i)=>{
                        let pathStr = getLinePathStr(d)
                        return (
                            <path 
                            key = {`path-${i}`}
                            className = {`Segment-${i}`}
                            d = {pathStr}
                            stroke = "#fff"
                            strokeWidth = "0.2"
                            fill = 'blue'
                            />
                        )

                })
                
            }

            let boundary_segments
            if(this.state.segmentBoxObjArray){
                console.log('render segmentBoxObjArray', this.state.segmentBoxObjArray)
                boundary_segments = this.state.segmentBoxObjArray.map((d, i)=>{
                    let boundarySegmentCoor = d.boundarySegmentCoor

                    let pathStr = getLinePathStr(boundarySegmentCoor)

                    return (
                        <path 
                        key = {`boundary_segments-${i}`}
                        className = {`boundary_segments-${i}`}
                        d = {pathStr}
                        stroke = "#fff"
                        strokeWidth = "0.2"
                        // fill = '#f00'
                        fill = {this.color_scale(d.dotCount)}
                        />
                    )
                })
            }

            /*
            Mapping simplified outer boundary with this.state.simplifiedArea
            Used this.state.even_point before, since we interpolate evenly on out boundary to get segments before
            No longer necessary for Phoenix map based algorithm
            Therefore, changed to simplifiedArea in this branch
             */
            let simplified_Outboundary
            if( this.state.simplifiedArea ) {
                simplified_Outboundary = MapColor(this.state.simplifiedArea, 1, geoPath().projection(this.autoProjection), '#2c75b1', 'outBoundary' )

            }

            //DrawSegmentsonMedianVerticalLines
            // let SegmentDots
            // SegmentDots = this.state.SegmentPoints.map((d, i) => {
            //     return(
            //         <circle
            //         key = {`SegmentDot-${i}`}
            //         r = "1"
            //         fill = "green"
            //         cx = {d[0]}
            //         cy = {d[1]}
            //         />
            //     )
            // })

            // No longer draw boundary from original chinaGeoData
            let outsideBoundary 

            this.state.chinaGeoData.map((d, i) => {
                if(d.properties.name === '湖南'){
                    //console.log(d)
                    this.autoProjection.fitSize([this.svg_w, this.svg_h], d)
                    outsideBoundary = <path
                        key = {`path-${ i }`}
                        d = { geoPath().projection(this.autoProjection)(d) }
                        stroke = "#eee"
                        strokeWidth = "2"
                        fill="none"
                        />
                    
                }
            })
            return [
                    //outsideBoundary, 
                    simplified_Outboundary,
                    //boundaryDots
               ]
               // .concat(innerBoundaryArr)
               .concat(
               [
                //SegmentDots,
                //verticalLines,
                //evenPoints,
                //MedianPoints,
                //segments,
                // boundary_segments
                // testPoints
                // medial_vertical_paths,
               ]
               )
        }
        const Regions = getRegionElements()
        
        // draw dots to the map 
        const Dots = this.state.pointsData.map((d,i) => {
            return (
            <circle 
            key = {`dot-${ i }`}
            cx = { this.autoProjection([ d.Longitude, d.Latitude ])[0]}
            cy = { this.autoProjection([ d.Longitude, d.Latitude ])[1]}
            fill="purple"
            r = "0.75"
            />
            )
        })

        let test_near
        if(this.state.test_near_points){
            test_near = this.state.test_near_points.map((d, i)=>{
                return(
                    <circle
                    key = {`test_near-${i}`}
                    r = ".5"
                    fill = "#dec009"
                    cx = {d[0]}
                    cy = {d[1]}
                    />
                )
            })
        }

        let innerBoundary
        if(this.state.simplifiedContours){
            console.log('render simplifiedContours', this.state.simplifiedContours)
            innerBoundary = 
            this.state.simplifiedContours.map((d, i) => {
            return (
            <path
                key = {`contours-${i}`}
                d = { geoPath().projection(this.autoProjection)(d) }
                stroke = "#fff"
                strokeWidth = "0.2"
                fill = "#edc949"
                fillOpacity = "0.8"
                className = "inner-boundary"
                />
                )
            })

        }

        return (
        <div>
            <p>Basemap</p>
            <svg id="myCanvas" width = {this.svg_w} height = {this.svg_h} viewBox = {`0 0 ${this.svg_w} ${this.svg_h}`}>
            <g className="Regions">
                {Regions}
            </g>
             <g className="Dots"> 
                {Dots}
            </g>
            <g className="test_near">
                {test_near}
            </g>
            <g className="innerBoundary">
                {innerBoundary}
            </g>
            </svg>
            {/* <CountPoint mainArea = {this.state.mainArea} points = {this.state.pointsData}/> */}
        </div>
        
        )

    }
}

export default BaseMap;