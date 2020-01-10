import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv } from 'd3'
import { findMats, traverseEdges } from 'flo-mat'
import Offset from 'polygon-offset'
import paper from 'paper'
const intersect = require('path-intersection')

console.log('paper', paper)

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            chinaGeoData: [],
            ZhejiangData:[],
            resDots: null,
            segment_path_len: 0.1
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
                let prev = list[i]
                let next = list[i+1]
                res[0].push([prev, next])
            }else {
                let prev = list[i]
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
    componentDidMount(){
        let _me = this

        paper.setup('myCanvas')

        fetch("/chinaGeo.geojson")
            .then(response => {
                if (response.status !== 200){
                    console.log('can not load geojson file')
                    return
                }
                response.json().then(chinaGeoData => {
                    console.log(chinaGeoData.features)
                    this.autoProjection = geoMercator().fitSize([_me.svg_w, _me.svg_h], chinaGeoData)
                    this.setState ({
                        chinaGeoData:  chinaGeoData.features,
                        outerBoundary: chinaGeoData.features[16].geometry.coordinates
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
                    return d.province === "Hunan"
                })
                this.setState({ZhejiangData: ZhejiangData})
            })
    }

    calcDistanceFromTwoPoints(point1, point2) {
        let [x0, y0] = point1,
            [x1, y1] = point2

        return Math.sqrt((x0 - x1)*(x0 - x1) + (y0 - y1)*(y0 - y1))
    }

    getEvenPointsFromCoordinates(coordinates, segment_len){
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

    getPerpendicularYfromX(A, B, x){ // A, B are line end points
        let k = (B.x-A.x)/(B.y-A.y)

        return -1*k*x + k*(A.x+B.x)/2 + (A.y+B.y)/2
    }

    getPerpendicularXfromAB(A, B, len){
        let M = {
                x: (B.x + A.x) / 2
            },
            k = (B.x-A.x)/(B.y-A.y),
            x = {
                pos: null,
                neg: null
            }
        
        x.pos = M.x + len/Math.sqrt(k*k + 1)
        x.neg = M.x - len/Math.sqrt(k*k + 1)

        return x
    }

    getVerticalPathFromEvenPoint(arr){
        // TODO:
        let MedianVerticalPoints = [],
            A, B
        
        for (let i = 0; i < arr.length; i++) {
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
            let δx = B.x - A.x
            let δy = B.y - A.y
            let tanθ = δy / δx
            let len = 2
            let M = {
                    x: (B.x + A.x) / 2,
                    y: (B.y + A.y) / 2
                },
                N = {
                    x: null,
                    y: null
                }

            let jie_x = this.getPerpendicularXfromAB(A, B, len)
                
            // TODO: 
            if(δy > 0){
                N.x = jie_x.pos
            }else{
                N.x = jie_x.neg
            }
            N.y = this.getPerpendicularYfromX(A, B, N.x)

            let median = [
                [M.x, M.y], 
                [N.x, N.y]
            ]

            MedianVerticalPoints.push(median)
        }
        
        return  MedianVerticalPoints 
    }

    getClosestIntersectPoints(v_end_points, medialPath){
        let _me = this,
            intersect_paths = [],
            // p_mats = new paper.Path(medialPath),
            inter_points = []

        v_end_points.forEach(e=>{
            let p0 = _me.autoProjection(e[0]),
                p1 = _me.autoProjection(e[1])

            let v_path = new paper.Path(`M${p0[0]} ${p0[1]} L${p1[0]} ${p1[1]}`)

            let intersect_points = []
            
            medialPath.forEach(e=>{
                let p_mat = new paper.Path(e),
                    temp_inter = p_mat.getIntersections(v_path)
                // console.log('temp_inter', temp_inter)
                if(temp_inter.length > 0){
                    intersect_points = intersect_points.concat(temp_inter)
                }
            })

            if(intersect_points.length > 0){
                let temp_point,
                    temp_dis = Infinity

                intersect_points.forEach(e=>{
                    let curr = _me.calcDistanceFromTwoPoints(p0, [e.point.x, e.point.y])
    
                    if(curr < temp_dis){
                        temp_dis = curr
                        temp_point = [e.point.x, e.point.y]
                    }

                    inter_points.push([e.point.x, e.point.y])
                })
    
                intersect_paths.push([p0, temp_point])
            }
        })

        return [intersect_paths, inter_points]
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

    componentDidUpdate(prevPros, prevState){
        let _me = this

        if(prevState.outerBoundary !== this.state.outerBoundary) {
            // store computed dots and paths 
            let resDots = []
            let resPaths = []
            // loops data format
            let resloop = this.constructList(this.state.outerBoundary[0])
            let mats = findMats(resloop, 1)
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

                    if(bezier.length === 2){
                        resPaths.push(_me.getLinePathStr(bezier))
                    }else if(bezier.length === 3){
                        resPaths.push(_me.getQuadBezierPathStr(bezier))
                    }else if(bezier.length === 4){
                        resPaths.push(_me.getCubicBezierPathStr(bezier))
                    }
                })
            }
            let medialPath = resPaths.join(' ')

            this.state.chinaGeoData.map((d,i) => {
                if (d.properties.name === '湖南'){
                    // compute interpolate  interpolate array with original boundary array
                    let mainArea = d.geometry.coordinates
                    // let interpolateNum = 3
                    console.log('mainArea[0]', mainArea[0].slice(0, 10))

                    let even_points = _me.getEvenPointsFromCoordinates(mainArea[0], 0.05)
                
                    let MedianVerticalPoints = _me.getVerticalPathFromEvenPoint(even_points)
                    
                    let MedialVerticalPaths = _me.getPathsfromPoints(MedianVerticalPoints)
                    // console.log('MedialVerticalPaths', MedianVerticalPoints)

                    let nk_intersect_points = _me.getClosestIntersectPoints(MedianVerticalPoints, resPaths)

                    function getLinesfromPoints(arr) {
                        let lines = []

                        for (let i=0; i < arr.length-1; i++) {
                            let x0 = arr[i][0][0],
                                y0 = arr[i][0][1],
                                x1 = arr[i][1][0],
                                y1 = arr[i][1][1]

                            lines.push(`M${x0} ${y0} L${x1} ${y1}`)
                        }

                        return lines
                    }
                    
                    // let segmentBorderPaths = getLinesfromPoints(segmentBorderPoints)
                    let segmentBorderPaths = getLinesfromPoints(nk_intersect_points[0])

                    this.setState({
                        // interpolatePoints: interpolatePoints,
                        //SegmentPoints: SegmentPoints,
                        // MedialVerticalPaths: MedialVerticalPaths,
                        resPaths: medialPath,
                        segmentBorderPaths: segmentBorderPaths,
                        even_points: even_points,
                        paper_inter: nk_intersect_points[1]
                    })
                    
                }
            })
        }
    }

    render() {
        // define province shapes with chinaGeoData
        const Regions = this.state.chinaGeoData.map((d, i) => {
            /**
             * only render zhejiang for showing more detail
             */
            if(d.properties.name === '湖南'){
                console.log('湖南', d)
                // no smooth boundary anymore, because that increase complexity for now

                let verticalLines
                if ( this.state.segmentBorderPaths ) {
                    verticalLines = this.state.segmentBorderPaths.map((d,i) => {
                        return (
                            <path 
                            className = "segmentBorder"
                            key = {`segmentBorder-${i}`}
                            d = {d}
                            stroke = "#000"
                            strokeWidth = "0.5"
                            />
                        )
                    })
                }

                let boundaryDots
                if ( this.state.interpolatePoints ) {

                    boundaryDots = this.state.interpolatePoints.map((d, i) => {
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

                let evenPoints
                if(this.state.even_points){
                    evenPoints = this.state.even_points.map((d, i)=>{
                        return(
                            <circle
                            key = {`evenPoints-${i}`}
                            r = "1"
                            fill = "#33ff22"
                            cx = {this.autoProjection(d)[0] }
                            cy = {this.autoProjection(d)[1] }
                            />
                        )
                    })
                }

                let medial_vertical_paths
                if(this.state.MedialVerticalPaths){
                    medial_vertical_paths = this.state.MedialVerticalPaths.map((d, i)=>{
                        return (
                            <path 
                            className = "vertical-path"
                            key = {`vertical-path-${i}`}
                            d = {d}
                            stroke = "#009"
                            strokeWidth = "0.1"
                            />
                        )
                    })
                }

                

//				//DrawSegmentsonMedianVerticalLines
//				let SegmentDots
//				SegmentDots = this.state.SegmentPoints.map((d, i) => {
//					return(
//						<circle
//						key = {`SegmentDot-${i}`}
//						r = "1"
//						fill = "green"
//						cx = {d[0]}
//						cy = {d[1]}
//						/>
//					)
//				})


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
					//SegmentDots,
                    verticalLines,
                    evenPoints,
                    medial_vertical_paths
                    // paper_inter
                ]
            }
            
        })

        //draw medial axis to the map
        let MedialAxis
        if( this.state.resPaths) {
           MedialAxis = <path
            key = {`medial-121212`}
            d = { this.state.resPaths}
            stroke = "#e56048"
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
            r = "0.75"
            />
            )
        })

        let paper_inter
        if(this.state.paper_inter){
            paper_inter = this.state.paper_inter.map((d, i)=>{
                return(
                    <circle
                    key = {`paper_inter-${i}`}
                    r = "1"
                    fill = "#009dec"
                    cx = {d[0]}
                    cy = {d[1]}
                    />
                )
            })
        }

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
            <g className="MedialAxis"> 
                {MedialAxis}
            </g>
            <g className="paper_inter">
                {paper_inter}
            </g>
            <g className="test_near">
                {test_near}
            </g>
            </svg>
        </div>
        
        )

    }
}

export default BaseMap;