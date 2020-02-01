import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, scaleSequential, interpolateOrRd } from 'd3'
import { findMats, traverseEdges, getPathsFromStr, Mat, toScaleAxis } from 'flo-mat'
// import  getThinnedPath  from './src/get-thinned-path';
import Offset from 'polygon-offset'
import simplify from 'simplify-js'
import paper from 'paper'
import CountPoint from './countPoint'
import MapColor from './mapColor'
// import { getThinnedPath } from './'
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
            simplifiedCoordinates: null,

            segmentBoxObjArray: null
        }

        this.autoProjection = null
        this.svg_w = 960
        this.svg_h = 600

        // offset
        this.offset = new Offset()
        this.offsetPadding = -0.2
        this.innerBoundaryCoordinates = null

        // segment
        this.segmentBoxObjArray = []
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

    // offset boundary
    // getContour(data, index) {
    //     let offsetCoordinates = data.map(e=>{
    //         try {
    //             let temp = new Offset(e).offset(this.offsetPadding* index)
    //             return temp
    //         } catch (error) {
    //             return null
    //         }
    //     })
    //     return offsetCoordinates
    // }

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
                    // console.log(chinaGeoData.features)
                    this.autoProjection = geoMercator().fitSize([_me.svg_w, _me.svg_h], chinaGeoData)
                    this.setState ({
                        chinaGeoData:  chinaGeoData.features,
                        outerBoundary: chinaGeoData.features[16].geometry.coordinates
                    })
                })
            })

        csv('/religious_data.csv').then( data => {
            // string to number
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
                // console.log('this.state.pointsData', pointsData)
            })
    }

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

    getMedianPointsFromEvenPoint(arr){
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
    
            //[_me.autoProjection(M.x), _me.autoProjection(M.y)]
            MedianPoints.push(median)
        }
        return MedianPoints

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

                    // inter_points.push([e.point.x, e.point.y])
                })
    
                inter_points.push([temp_point[0], temp_point[1]])
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

    getSegmentFromPoints(medianPoints, InterPoints) {
        //console.log(InterPoints)
        let _me = this
        let segments = [],
        A1, A2, B1, B2
    
        for (let i = 0; i < medianPoints.length; i++) {
            if(i === medianPoints.length - 1){
                A1 = {
                    x: medianPoints[i][0],
                    y: medianPoints[i][1]
                }
                A2 = {
                    x: medianPoints[0][0],
                    y: medianPoints[0][1]
                }
                B1 = {
                    x: InterPoints[i][0],
                    y: InterPoints[i][1]
                }
                B2 = {
                    x: InterPoints[0][0],
                    y: InterPoints[0][1]
                }
            }else{
                A1 = {
                    x: medianPoints[i][0],
                    y: medianPoints[i][1]
                }
                A2 = {
                    x: medianPoints[i+1][0],
                    y: medianPoints[i+1][1]
                }
                B1 = {
                    x: InterPoints[i][0],
                    y: InterPoints[i][1]
                }
                B2 = {
                    x: InterPoints[i+1][0],
                    y: InterPoints[i+1][1]
                }
            }

            let segment = [
                [A1.x, A1.y],
                [A2.x, A2.y],
                [B2.x, B2.y],
                [B1.x, B1.y]
            ]

            segments.push(segment)

        }
        return segments
    }

    getSubsegmentFromSegment(segments, interpolateNum) {
        
    }

    getInnerBoundaryCoordinates(coordinates){
        let offsetCoordinates = new Offset(coordinates).offset(this.offsetPadding)

        this.innerBoundaryCoordinates = offsetCoordinates.filter(e => !!e)

        let paddinged = {
            type: 'Feature',
            properties: {
            },  
            geometry: {
                type: 'Polygon',
                coordinates: this.innerBoundaryCoordinates
            }
        }

        return paddinged
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

        if(prevState.outerBoundary !== this.state.outerBoundary) {

            this.state.chinaGeoData.map((d,i)=> {
            if (d.properties.name === '湖南'){
                // store computed dots and paths 
                const mainArea = d.geometry.coordinates
                const simplifiedFactor = 1
                
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

                _me.state.simplifiedCoordinates = _me.getInnerBoundaryCoordinates(simplifiedArea)
                console.log('mainArea', _me.state.simplifiedCoordinates)
                let resDots = []
                let resPaths = []
                // loops data format
                let resloop = this.constructList(simplifiedArea)
                
                // s: the scale axis transform parameter
                const s = 2.5

                //get medial axis transforms
                let mats = findMats(resloop, 3)

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

                //get scale axis transforms
                let sats = mats.map(mat => toScaleAxis(mat, s))
                // Get new thickest width
                let thickestWidth = 0;
                sats.forEach(sat => {
                    let r = sat.cpNode.cp.circle.radius;
                    if (r > thickestWidth) { thickestWidth = r; }
                });
                // let satPath = getThinnedPath(sats, 0.3)

                // console.log('mainArea[0]', mainArea[0].slice(0, 10))

                let even_points = _me.getEvenPointsFromCoordinates(simplifiedArea, 0.05)
                
                let MedianPoints = _me.getMedianPointsFromEvenPoint(even_points)
                // console.log(MedianPoints)

                let MedianVerticalPoints = _me.getVerticalPathFromEvenPoint(even_points)
                //console.log(MedianVerticalPoints)
                
                let MedialVerticalPaths = _me.getPathsfromPoints(MedianVerticalPoints)
                // console.log('MedialVerticalPaths', MedianVerticalPoints)

                let nk_intersect_points = _me.getClosestIntersectPoints(MedianVerticalPoints, resPaths)
                console.log('nk_intersect_points', nk_intersect_points)

                //let intersection_points = getSecondElements(nk_intersect_points[0])
                
                // ISSUE: -> Fixed
                // len(Median Points) !== len(nk_intersect_points[1])
                console.log('len(Median Points)', MedianPoints.length, 'len(nk_intersect_points[1])', nk_intersect_points[1].length)
                let segments = _me.getSegmentFromPoints(MedianPoints, nk_intersect_points[1])
                let subSegments = _me.getSubsegmentFromSegment(segments, 3)
                // console.log('segments', segments)

                // calc boundary segments
                let boundary_segments = _me.getBoundarySegments(segments)

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
                let segmentBorderPaths = getLinesfromPoints(nk_intersect_points[0])
                //console.log(nk_intersect_points[0])
                this.setState({
                    // interpolatePoints: interpolatePoints,
                    // SegmentPoints: SegmentPoints,
                    MedialVerticalPaths: MedialVerticalPaths,
                    //rea: mainArea,
                    //simplifiedArea: simplifiedArea,
                    resPaths: medialPath,
                    segmentBorderPaths: segmentBorderPaths,
                    even_points: even_points,
                    MedianPoints: MedianPoints,
                    paper_inter: nk_intersect_points[1],
                    segments: segments,
                    boundary_segments: boundary_segments
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
            if(this.state.even_points) {
                evenPoints = this.state.even_points.map((d, i)=>{
                    return(
                        <circle
                        key = {`evenPoints-${i}`}
                        r = ".5"
                        fill = "#33ff22"
                        cx = {this.autoProjection(d)[0] }
                        cy = {this.autoProjection(d)[1] }
                        />
                    )
                })
            }

            let MedianPoints
            if(this.state.MedianPoints) {

                MedianPoints= this.state.MedianPoints.map((d, i)=>{
                    return(
                        <circle
                        key = {`medianPoints-${i}`}
                        className = {`medianPoints-${i}`}
                        r = ".5"
                        fill = "purple"
                        cx = {d[0] }
                        cy = {d[1] }
                        />
                    )
                })
            }

            // let testPoints
            // if(this.state.segments) {

            //     testPoints= this.state.segments.map((d, i)=>{
            //         // if (i <1 ){
            //         //     console.log(d[2])
            //         //     return(
            //         //         <circle
            //         //         key = {`segments-${i}`}
            //         //         className = {`segments-${i}`}
            //         //         r = "1"
            //         //         fill = "red"
            //         //         cx = {d[2][0] }
            //         //         cy = {d[2][1]}
            //         //         />
            //         //     )
            //         // } 
            //         return(
            //             <circle
            //             key = {`segments-${i}`}
            //             className = {`segments-${i}`}
            //             r = "1"
            //             fill = "red"
            //             cx = {d[2][0] }
            //             cy = {d[2][1]}
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

            let segments
            if(this.state.segments) {
                segments = this.state.segments.map((d, i)=>{
                    if (i < 10) {
                        // console.log(d)
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
                    }
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

            let medial_vertical_paths
            if(this.state.MedialVerticalPaths) {
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

            let simplified_boundary
            if( this.state.even_points ) {
                let temp = JSON.parse(JSON.stringify(this.state.even_points))
                temp.push(this.state.even_points[0])
                // temp: [coordinate1, coordinate2, ..., coordinate1]
                simplified_boundary = MapColor(temp, 1, geoPath().projection(this.autoProjection), '#2c75b1', 'outBoundary' )

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
                    
                    // console.log('dddddd', d)
                    // [offsetCoordinates, offsetCoordinates2, xxx3]    
                    // let innerContourArr = []
                    // for (let i=0; i<= 10; i++ ) {
                    //     innerContourArr.push(this.getContour(d.geometry.coordinates, i).filter(e => !!e))
                    // }
                    
                    // let paddingedArr = innerContourArr.map(e => {
                    //     let paddinged = {
                    //         type: 'Feature',
                    //         properties: {
                    //             id: "33-1",
                    //             latitude: 29.1084,
                    //             longitude: 119.97,
                    //             name: "浙江"
                    //         },  
                    //         geometry: {
                    //           type: 'MultiPolygon',
                    //           coordinates: e
                    //         }
                    //     }
                    //     return paddinged
                    // })

                    // // console.log(paddingedArr)
                    
                    // let innerBoundaryArr = paddingedArr.map((e, i) => {
                    //     // console.log(i)
                    //     let contourColor = null
                    //     if (i == 0) {
                    //         contourColor = '#fff'
                    //     } else if (i == 1) {
                    //         contourColor = '#edc949'
                    //     }
                    //     else {
                    //         contourColor = 'transparent'
                    //     }
                    //     return MapColor(e, i, geoPath().projection(this.autoProjection), contourColor, 'inner')
                    // }) 
                }
            })
            return [
                    //outsideBoundary, 
                    simplified_boundary,
                    boundaryDots
               ]
               // .concat(innerBoundaryArr)
               .concat(
               [
                //SegmentDots,
                verticalLines,
                evenPoints,
                MedianPoints,
                segments,
                boundary_segments
                // testPoints
                // medial_vertical_paths,
               ]
               )
        }
        const Regions = getRegionElements()

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

        let paper_inter
        if(this.state.paper_inter){
            paper_inter = this.state.paper_inter.map((d, i)=>{
                // if (i<2) {
                //     console.log(d)
                //     return(
                //         <circle
                //         key = {`paper_inter-${i}`}
                //         className = {`paper_inter-${i}`}
                //         r = "1"
                //         fill = "orange"
                //         cx = {d[0]}
                //         cy = {d[1]}
                //         />
                //     )
                // }
                return(
                    <circle
                    key = {`paper_inter-${i}`}
                    className = {`paper_inter-${i}`}
                    r = ".5"
                    fill = "orange"
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

        let innerBoundary
        if(this.state.simplifiedCoordinates){
            console.log('render simplifiedCoordinates', this.state.simplifiedCoordinates)
            innerBoundary = <path
                d = { geoPath().projection(this.autoProjection)(this.state.simplifiedCoordinates) }
                stroke = "#fff"
                strokeWidth = "0.2"
                fill = "#edc949"
                fillOpacity = "0.8"
                className = "inner-boundary"
                />
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