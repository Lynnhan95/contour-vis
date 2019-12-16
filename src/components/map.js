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

    vLineEquation(A, B, x){ // A, B are known points
        let k = (B.x-A.x)/(B.y-A.y)
        
        return -1*k*x + k*(A.x+B.x)/2 + (A.y+B.y)/2
    }

    getVerticalPathFromEvenPoint(){
        // TODO:
    }

    componentDidUpdate(prevPros, prevState){
        let _me = this

        if(prevState.outerBoundary !== this.state.outerBoundary) {
        // store computed dots and paths 
        let resDots = [];
        const resPaths = []
        // loops data format
        // let testloop = [
        // [
        //     [[50.000, 95.000],[92.797, 63.905]], 
        //     [[92.797, 63.905],[76.450, 13.594]],
        //     [[76.450, 13.594],[23.549, 13.594]],
        //     [[23.549, 13.594],[7.202, 63.90]],
        //     [[7.202,  63.900],[50.000, 95.000]]
        // ]
        // ];
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

                if(bezier.length === 2){
                    resPaths.push(_me.getLinePathStr(bezier))
                }else if(bezier.length === 3){
                    resPaths.push(_me.getQuadBezierPathStr(bezier))
                }else if(bezier.length === 4){
                    resPaths.push(_me.getCubicBezierPathStr(bezier))
                }
            })
        }
        let medialPath = resPaths.join('')

        this.state.chinaGeoData.map((d,i) => {
            if (d.properties.name === '湖南'){
                // compute interpolate  interpolate array with original boundary array
                let mainArea = d.geometry.coordinates
                // let interpolateNum = 3

                function getInterpolatePoints(arr, interpolateNum) {
                    let interpolatePoints = []
                    arr.forEach(e=>{
                        for(let i=0; i< e.length; i++) {
                            if(i<e.length-1)
                            {
                                let prev = e[i]
                                let next = e[i+1]
                                let thetaX = ( next[0] - prev[0] ) 
                                let thetaY = ( next[1] - prev[1] )
                                for(let j=1; j<= interpolateNum; j++ ) {
                                    let cur = []
                                    cur[0] = prev[0] + ( j / interpolateNum ) * thetaX 
                                    cur[1] = prev[1] + ( j / interpolateNum ) * thetaY
                                    interpolatePoints.push(cur)
                                }
                            }
                            else if(i === e.length-1)
                            {
                                let prev = e[i]
                                let next = e[0]
                                let thetaX = ( next[0] - prev[0] ) 
                                let thetaY = ( next[1] - prev[1] )
                                for(let j=1; j<= interpolateNum; j++ ) {
                                    let cur = []
                                    cur[0] = prev[0] + ( j / interpolateNum ) * thetaX 
                                    cur[1] = prev[1] + ( j / interpolateNum ) * thetaY
                                    interpolatePoints.push(cur)
                                }
                            }
                            
                        }
                    })
                    return interpolatePoints
                }
                // let interpolatePoints = getInterpolatePoints(mainArea, 3)

                let even_points = _me.getEvenPointsFromCoordinates(mainArea[0], _me.state.segment_path_len)
               
                function getMedialVerticalPoints(arr) {
                    let MedianVerticalPoints = [],
                        prev, next
                    
                    for (let i = 0; i < arr.length; i++) {
                        if(i === arr.length - 1){
                            prev = arr[arr.length-1]
                            next = arr[0]
                        }else{
                            prev = arr[i]
                            next = arr[i + 1]
                        }
                        let δx = next[0] - prev[0]
                        let δy = next[1] - prev[1]
                        let tanθ = δy / δx
                        let len = .5
                        let median
                        let Xa = (next[0] + prev[0]) / 2,
                            Ya = (next[1] + prev[1]) / 2,
                            Xb, Yb
                            
                        // TODO: 
                        // if(tanθ > 0){
                        //     Xb = Xa - (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     Yb = Ya + (len / Math.sqrt(tanθ*tanθ + 1))
                        // }else{
                        //     Xb = Xa + (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     Yb = Ya + (len / Math.sqrt(tanθ*tanθ + 1))
                        // }
                        // if(δy > 0){
                        //     Yb = Ya + (len / Math.sqrt(tanθ*tanθ + 1))
                        // }else{
                        //     Yb = Ya - (len / Math.sqrt(tanθ*tanθ + 1))
                        // }

                        // if(δx > 0){
                        //     if(tanθ > 0){ // 同号
                        //         Xb = Xa + (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     }else{ // 异号
                        //         Xb = Xa - (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     }
                        // }else{
                        //     if(tanθ > 0){ // 异号
                        //         Xb = Xa - (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     }else{ // 同号
                        //         Xb = Xa + (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                        //     }
                        // }
                        if(tanθ > 0){
                            if(δy > 0){
                                Yb = Ya + (len / Math.sqrt(tanθ*tanθ + 1))
                                Xb = Xa + (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                            }else{
                                Yb = Ya - (len / Math.sqrt(tanθ*tanθ + 1))
                                Xb = Xa - (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                            }
                        }else{
                            if(δy > 0){
                                Yb = Ya + (len / Math.sqrt(tanθ*tanθ + 1))
                                Xb = Xa + (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                            }else{
                                Yb = Ya - (len / Math.sqrt(tanθ*tanθ + 1))
                                Xb = Xa - (len*tanθ / Math.sqrt(tanθ*tanθ + 1))
                            }
                        }

                        median = [
                            [Xa, Ya], 
                            [Xb, Yb]
                        ]

                        MedianVerticalPoints.push(median)
                    }
                    
                    return  MedianVerticalPoints 
                }
                let MedianVerticalPoints = getMedialVerticalPoints(even_points)
                
                function getPathsfromPoints(arr) {
                    let MedialVerticalPaths = []
                    for (let i=0; i< arr.length; i++) {
                        let x0 = _me.autoProjection(arr[i][0])[0], 
                            y0 = _me.autoProjection(arr[i][0])[1]
                        let x1 = _me.autoProjection(arr[i][1])[0], 
                            y1 = _me.autoProjection(arr[i][1])[1]

                        MedialVerticalPaths.push(`M${x0} ${y0} L${x1} ${y1}`);
                    }
                    return MedialVerticalPaths
                }
                let MedialVerticalPaths = getPathsfromPoints(MedianVerticalPoints)
                
                function CalculateIntersection(path1, path2) {  
                    var intersection = intersect(path1, path2)
                    return intersection
                }

                let paper_inter, test_near_points = []
                if(this.state.chinaGeoData){
                    paper.setup('myCanvas')

                    let test_path1 = new paper.Path('M298.6176759180689 454.83509800690354 L327.91220863382114 436.9236819216658'),
                        p1 = [298.6176759180689, 454.83509800690354],
                        test_path2 = new paper.Path('M275.48356169878025 368.7534409032455 L300.59881713695455 410.0156271911363'),
                        p2 = [275.48356169878025, 368.7534409032455],
                        test_medialPath = new paper.Path(medialPath)

                    let inter1 = test_medialPath.getIntersections(test_path1)
                    let inter2 = test_medialPath.getIntersections(test_path2)
                    paper_inter = [].concat(inter1, inter2)
                    console.log('TEST', paper_inter)

                    let point1, dis1 = Infinity
                    inter1.forEach((e)=>{
                        let curr = _me.calcDistanceFromTwoPoints(p1, [e.point.x, e.point.y])

                        if(curr < dis1){
                            dis1 = curr
                            point1 = [e.point.x, e.point.y]
                        }
                    })

                    let point2, dis2 = Infinity
                    inter2.forEach((e)=>{
                        let curr = _me.calcDistanceFromTwoPoints(p2, [e.point.x, e.point.y])

                        if(curr < dis2){
                            dis2 = curr
                            point2 = [e.point.x, e.point.y]
                        }
                    })

                    test_near_points.push(point1, point2)

                    console.log('test_near_points', test_near_points)
                }
                
                
                function getIntersectPoints(arr) {  
                    let intersectPoints = []
                    let countError = 0
                    for(let i = 0; i < arr.length; i++ ) {  
                        let path1 = arr[i]
                        // Snap.path.intersection
                        let res = CalculateIntersection(path1, medialPath)
                        // let res = Snap.pathintersection(path1, medialPath)
                        if (res.length === 0) {
                            countError += 1
                        }
                        intersectPoints.push(res)
                    }
                    console.log('countError', countError)
                    return intersectPoints
                }
                
                let intersectPoints = getIntersectPoints(MedialVerticalPaths)
                
                function CalcDistance(x0, y0, x1, y1) {
                    let distance = Math.sqrt((x0 - x1)*(x0 - x1) + (y0 - y1)*(y0 - y1))
                    return distance
                }
                // console.log("interpolatePoints", interpolatePoints.length)
                console.log("MedianVerticalPt", MedianVerticalPoints.length)
                console.log("MedialVerticalPaths", MedialVerticalPaths.length)
                // console.log("intersectPoints", intersectPoints)
                

                function GetClosestPoint(arr1, arr2) {
                    let segmentBorderPoints = []
                    for(let i = 0; i< arr2.length-1; i++) {
                        let MedianPoint_x = (arr1[i][0] + arr1[i+1][0]) / 2
                        let MedianPoint_y = (arr1[i][1] + arr1[i+1][1]) / 2
                        let ProjectedPoint_x = _me.autoProjection([MedianPoint_x, MedianPoint_y])[0]
                        let ProjectedPoint_y = _me.autoProjection([MedianPoint_x, MedianPoint_y])[1]
                        let MedianPoint = [ProjectedPoint_x , ProjectedPoint_y ]
                        let FinalPoint = []
                        let mindistance = 100000
                        if(arr2[i].length > 0){
                            for(let j = 0; j< arr2[i].length; j++)
                            {
                                let IntersectionpPoint = [arr2[i][j].x, arr2[i][j].y]
                                let distance = CalcDistance(MedianPoint[0], MedianPoint[1], IntersectionpPoint[0], IntersectionpPoint[1])
                                if( distance < mindistance)
                                {
                                    mindistance = distance
                                    FinalPoint = IntersectionpPoint
                                }
                            }
                            segmentBorderPoints.push([MedianPoint, FinalPoint])
                        }
                    }
                    return segmentBorderPoints
                }
                
                let segmentBorderPoints = GetClosestPoint(even_points, intersectPoints)

                function getLinesfromPoints(arr) {
                    let segmentBorderPaths = []
                    let countError = 0
                    for (let i=0; i< arr.length-1; i++) {
                        let x0 = arr[i][0][0], y0 = arr[i][0][1]
                        let x1 = arr[i][1][0], y1 =arr[i][1][1]

                        segmentBorderPaths.push(`M${x0} ${y0} L${x1} ${y1}`);
  
                    }
                    console.log(countError)
                    return segmentBorderPaths
                }
				
				function MedianVerticalSegments(arr){
					let SegmentArray = []
					for(let i = 0; i < arr.length-1; i++)
						{
							let theataX = arr[i][1][0] - arr[i][0][0]
							let theataY = arr[i][1][1] - arr[i][0][1]
							for(let j = 0; j<= 5; j++)
							{
								SegmentArray.push([arr[i][0][0] + (theataX * j / 5), arr[i][0][1] + theataY * j / 5])
							}
						}
					return SegmentArray
				}
				
				let SegmentPoints = MedianVerticalSegments(segmentBorderPoints)
                let segmentBorderPaths = getLinesfromPoints(segmentBorderPoints)

                this.setState({
                    // interpolatePoints: interpolatePoints,
					//SegmentPoints: SegmentPoints,
                    MedialVerticalPaths: MedialVerticalPaths,
                    resPaths: medialPath,
                    segmentBorderPaths: segmentBorderPaths,
                    even_points: even_points,
                    paper_inter: paper_inter,
                    test_near_points: test_near_points
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
                    medial_vertical_paths,
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
                    cx = {d.point.x}
                    cy = {d.point.y}
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