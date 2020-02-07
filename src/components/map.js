import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, scaleSequential, interpolateOrRd, select, nest} from 'd3'
import { findMats, traverseEdges, getPathsFromStr, Mat, toScaleAxis } from 'flo-mat'
import Offset from 'polygon-offset'
import simplify from 'simplify-js'
import paper from 'paper'
import CountPoint from './countPoint'
import MapColor from './mapColor'
import polygonClipping from 'polygon-clipping'
import { polygonContains } from 'd3-polygon'
import {getDensity} from "./getDensity";
import {interpolateSegment} from './interpolateSegment'
import {getBeltSegment} from './getBeltSegment'
import {insideCounter} from './insideCounter'
import {getNewSeg} from './getNewSeg.js'
import {getBeltSeg} from './getBeltSeg.js'
import {Slider, Select} from 'antd'
import "antd/dist/antd.css";
import "./style.css"
import ProviencesNames from './chinaProvincesName'
import chinaProvincesName from './chinaProvincesName'
import keyBy from 'lodash.keyby'
const { Option } = Select

const setSegNumb = 5000
const slidingBins = 150

const intersect = require('path-intersection')


// global varibales:

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            province_en: 'Hunan',
            province_cn: '湖南',
            currGeoData: [],
            chinaGeoData: [],
            pointsData:[],
            resDots: null,
            segment_path_len: 0.1,
            simplifiedContours: null,

            segmentBoxObjArray: null
        }

        this.svgMargin = 20;
        this.autoProjection = null
        this.svg_w = 960
        this.svg_h = 600

        // offset
        this.offset = new Offset()
        this.innerBoundaryCoordinates = null

        // segment
        this.segmentBoxObjArray = []

        // nest data
        this.pointsDataNest = null
        this.chinaGeoDataNest = null
        this.chinaProvincesNameNest = keyBy(chinaProvincesName, d=>d.provincePhonetic)
    }

    onAfterChange = value => {
        this.setState({
          inputValue: value,
        });
        console.log(value)
    }

    onChange(value) {
        let name_en = value,
            name_cn = this.chinaProvincesNameNest[value].provinceName

        this.setState({
            currGeoData: this.chinaGeoDataNest[name_cn]
        })
        console.log(`selected ${name_cn} ${name_en}`);
    }

    /* when component will mount, fetch geojson and csv data locally */
    componentDidMount(){
        let _me = this

        paper.setup('myCanvas')

        Promise.all([fetch("/chinaGeo.geojson"), csv('/religious_data.csv')])
            .then(result=>{
                let response = result[0],
                    religious_data = result[1]

                /**
                 * religious_data
                 */
                religious_data.forEach(d => {
                    d["id"] = +d["id"];
                    d["Latitude"] = +d["Latitude"]
                    d["Longitude"] = +d["Longitude"]
                    d["year"] = +d["year"]
                })
                let entries = nest()
                    .key(d=>d.province)
                    .entries(religious_data)

                let entriesObj = keyBy(entries, d=>d.key)

                _me.pointsDataNest = entriesObj

                /**
                 * chinaGeo
                 */
                response.json().then(chinaGeoData => {
                    this.autoProjection = geoMercator().fitExtent([[this.svgMargin/2, this.svgMargin/2],[this.svg_w- this.svgMargin/2 , this.svg_h-this.svgMargin/2]], chinaGeoData)

                    let featuresObj = keyBy(chinaGeoData.features, d=>d.properties.name)

                    _me.chinaGeoDataNest = featuresObj

                    console.log('Promise currGeoData', _me.chinaGeoDataNest[_me.state.province_cn]);
                    
                    _me.setState ({
                        chinaGeoData: chinaGeoData.features,
                        currGeoData: _me.chinaGeoDataNest[_me.state.province_cn],
                        pointsData: _me.pointsDataNest[_me.state.province_en].values
                    })
                })
                
            })
            .catch(error=>{
                console.error(error)
            })

        /* Fetching Geo-boundary data from geojson file */
        // fetch("/chinaGeo.geojson")
        //     .then(response => {
        //         if (response.status !== 200){
        //             //console.log('can not load geojson file')
        //             return
        //         }
        //         response.json().then(chinaGeoData => {
        //             this.autoProjection = geoMercator().fitExtent([[this.svgMargin/2, this.svgMargin/2],[this.svg_w- this.svgMargin/2 , this.svg_h-this.svgMargin/2]], chinaGeoData)

        //             let featuresObj = keyBy(chinaGeoData.features, d=>d.properties.name)
        //             console.warn('featuresObj', featuresObj);
        //             _me.chinaGeoDataNest = featuresObj
                    
        //             this.setState ({
        //                 chinaGeoData: chinaGeoData.features,
        //                 currGeoData: _me.chinaGeoDataNest[_me.state.province]
        //             })
        //         })
        //     })

        // csv('/religious_data.csv').then( data => {
        //     // Converting certain csv data from string to number
        //     data.forEach( (d) => {
        //       d["id"] = +d["id"];
        //       d["Latitude"] = +d["Latitude"]
        //       d["Longitude"] = +d["Longitude"]
        //       d["year"] = +d["year"]
        //     })
        //     return data

        //     }).then( data => {
        //         // const pointsData = data.filter( (d) => {
        //         //     return d.province === "Hunan"
        //         // })
        //         let entries = nest()
        //             .key(d=>d.province)
        //             .entries(data)

        //         let entriesObj = keyBy(entries, d=>d.key)

        //         _me.pointsDataNest = entriesObj
        //         // this.setState({pointsData: pointsData})
        //         this.setState({
        //             pointsData: _me.pointsDataNest[_me.state.province].values
        //         })
        //     })
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

    //     return -1*k*x + k*(A.x+B.x)/2getBeltSeg + (A.y+B.y)/2
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
            ////console.log(median)
                MedianPoints.push(median)
        }
        return MedianPoints

    }

    getInnerBoundaryContours(coordinates, num) {

        let contours = []
        // HARDCODE 1.89: Api confusion
        // let dist = 0.1/ (num)
        for(let i=1; i< num+1 ; i++) {

            const padding = (-1.6/num)
            //console.log(padding)
            let offsetContour = new Offset(coordinates).offset(padding* i)
            // Set the first contour as clipping_boundary
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

    componentDidUpdate(prevPros, prevState){
        let _me = this

        // if(prevState.chinaGeoData !== this.state.chinaGeoData) {
        if(prevState.currGeoData !== this.state.currGeoData){
            console.log('currGeoData update')
            // this.state.chinaGeoData.map((d,i)=> {
            // if (d.properties.name === '湖南'){
                // store computed dots and paths
                const d = this.state.currGeoData
                console.warn('dddddd', d);
                
                const mainArea = d.geometry.coordinates
                const simplifiedFactor = 0.4

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
                //console.log('mainArea', _me.state.simplifiedContours)

                let even_points = _me.getEvenPointsFromCoordinates(simplifiedArea, 0.05)

                let MedianPoints = _me.getMedianPointsFromEvenPoint(even_points)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // convert boundary to path for computing.
                // get an array of all max inscribled circles [Object:{radius,centerX,centerY}]

                let simplifiedAreaProjected = simplifiedArea.map((d)=> {return this.autoProjection(d)})

                let [circleAry,segPolyList] = getDensity(select("#myCanvas"),simplifiedAreaProjected,setSegNumb)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // create new segList by clipping from mainArea polygon
                let clip_outBoundary = simplifiedArea.map((d) => {
                    return this.autoProjection(d)
                })

                let newSegPolyList = []

                segPolyList.forEach((d,i) => {
                  let newSegPoly = getNewSeg(d, clip_outBoundary,i)

                  newSegPolyList.push(newSegPoly)

                })

                console.log(newSegPolyList)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
            subsegments
*/

                let subSegList = []
                const subSegNum = 3 // set how many subsegments we divide each seg
                newSegPolyList.forEach((d,i) => {

                    let subSeg = interpolateSegment(d, subSegNum,i)
                    subSegList.push(subSeg)

                })

                //console.log(subSegList)
                // console.log(insideCounter(subSegList,this.state.pointsData));


/*
            belt
*/
                //console.log(this.innerBoundaryCoordinates)
                //Compute belt from newSegPolyList
                let clip_boundary = this.innerBoundaryCoordinates[0].map((d) => {
                    return this.autoProjection(d)
                })
                let beltSegList = []
                segPolyList.forEach((d, i) => {
                    let beltSeg = getBeltSeg(d, clip_outBoundary, clip_boundary, i)
                    beltSegList.push(beltSeg)
                })
                console.log(beltSegList)
/*
            belt cells

*/
                let beltCellList = []
                beltSegList.forEach((d) => {
                    let subCell = interpolateSegment(d, subSegNum)
                    beltCellList.push(subCell)
                })

                //console.log(beltCellList)


                //let beltSeg = getBeltSegment(segPoly, clip_boundary)


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                // //console.log(MedianPoints)

                // let MedianVerticalPoints = _me.getVerticalPathFromEvenPoint(even_points)
                ////console.log(MedianVerticalPoints)

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
                    inscribledCircles :circleAry,
                    linePts : simplifiedAreaProjected,
                    subSegList:subSegList,
                    beltCellList: beltCellList,
                    beltSegList:beltSegList,
                    segPolyList: segPolyList,
                    newSegPolyList:newSegPolyList

                    // paper_inter: nk_intersect_points[1],
                    //segments: segments,
                    //boundary_segments: boundary_segments
                })
            // }
            // })
        }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (prevState.subSegList !== this.state.subSegList) {
            console.log('pointsData update', this.state.subSegList)
            var pointsDataProjected = this.state.pointsData.map((e)=>{
                return _me.autoProjection([ e.Longitude, e.Latitude ])
            })

            var [densityGroup,areGroup] = insideCounter(this.state.subSegList,pointsDataProjected,setSegNumb,slidingBins)
            console.log(densityGroup);
/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////after getting the density, we need to adjust the values based on empirical settings/////
///////////////slidng window and scaler are applied


            var cellGroup = this.state.beltCellList
            //console.log(cellGroup[0], densityGroup[0])
            let cellObjArr = []
            for(let i=0; i< densityGroup.length; i++) {
                for(let j=0; j< densityGroup[i].length; j++) {
                    let cellObj = {}
                    cellObj.coor = cellGroup[i][j]
                    cellObj.dens = densityGroup[i][j]
                    cellObjArr.push(cellObj)
                }
            }
            //console.log(cellObjArr)
            let cell_extent = extent(cellObjArr, (d)=>{
                return d.dens
            })
            this.color_scale = scaleSequential(interpolateOrRd).domain(cell_extent)
            this.setState({
                cellObjArr: cellObjArr 
            })
            console.log(cellObjArr)

        }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (prevState.inputValue !== this.state.inputValue) {
            console.log(this.state.inputValue)
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

            let inscribledCircles
            if(this.state.inscribledCircles) {

                inscribledCircles = this.state.inscribledCircles.map((d,i) => {

                    return (
                        <circle
                        cx = {d.centerX }
                        cy = {d.centerY}
                      //  r =  {0.1}// only plot the centers
                        r = {d.radius}
                        stroke = "#000"
                        fill = "none"
                        strokeWidth = "0.1"
                        />
                    )
                })
            }

            let segPoly
            if(this.state.segPolyList) {
                segPoly = this.state.segPolyList.map((d, i) => {

                    let pathStr = getLinePathStr(d)

                    return (
                        <path
                        key = {`path-${i}`}
                        className = {`Segment-${i}`}
                        d = {pathStr}
                        stroke = "none"
                        strokeWidth = "0.2"
                        fill = 'blue'
                        />
                    )
                })
            }


            let evenPoints
            // if(this.state.even_points) {
            //     evenPoints = this.state.even_points.map((d, i)=>{
            //         console.log(d)
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

            let linePts
            if (this.state.linePts) {
              linePts = this.state.linePts.map((d,i) => {
                  return (
                  <circle
                  key = {`dot-${ i }`}
                  cx = { d[0]}
                  cy = { d[1]}
                  fill = "#33ff22"
                  r = "2"
                  />
                  )
              })
            }



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
                            fill-opacity = '0.2'
                            />
                        )

                })

            }

            let cells0,cells1,cells2
            if(this.state.cellObjArr){
                cells0 = this.state.cellObjArr.map((d, i) => {
                    let pathStr0 = getLinePathStr(d.coor)
                      return (
                          <path
                          key = {`split_boundary_segments-${i}`}
                          className = {`split_boundary_segments-${i}`}
                          d = {pathStr0}
                          //fill = '#f00'
                          fill = {this.color_scale(d.dens)}
                          />
                      )

                })
                cells1 = this.state.subSegList.map((d, i) => {
                    let pathStr0 = getLinePathStr(d[1])
                      return (
                          <path
                          key = {`split_boundary_segments-${i}`}
                          className = {`split_boundary_segments-${i}`}
                          d = {pathStr0}
                          fill = 'green'
                          // fill = {this.color_scale(d.dens)}
                          />
                      )

                })
                cells2 = this.state.subSegList.map((d, i) => {
                    let pathStr0 = getLinePathStr(d[2])
                      return (
                          <path
                          key = {`split_boundary_segments-${i}`}
                          className = {`split_boundary_segments-${i}`}
                          d = {pathStr0}
                          fill = 'blue'
                          // fill = {this.color_scale(d.dens)}
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
                simplified_Outboundary = MapColor(this.state.simplifiedArea, 1, geoPath().projection(this.autoProjection), 'transparent', 'outBoundary' )

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
                    ////console.log(d)fitExtent([this.svgMargin/2, this.svgMargin/2],[_me.svg_w- this.svgMargin/2 , _me.svg_h-this.svgMargin/2], chinaGeoData)
                    this.autoProjection.fitExtent([[this.svgMargin/2, this.svgMargin/2],[this.svg_w- this.svgMargin/2 , this.svg_h-this.svgMargin/2]], d)
                    outsideBoundary = <path
                        key = {`path-${ i }`}
                        d = { geoPath().projection(this.autoProjection)(d) }
                        stroke = "black"
                        strokeWidth = "2"
                        fill="none"
                        />

                }
            })
            return [
                    //outsideBoundary,
                    simplified_Outboundary,
                    // inscribledCircles,
                    linePts,
                    cells0,
                    // cells1,
                    // cells2,
                    // segPoly
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
            //console.log('render simplifiedContours', this.state.simplifiedContours)
            innerBoundary =
            this.state.simplifiedContours.map((d, i) => {
            return (
            <path
                key = {`contours-${i}`}
                d = { geoPath().projection(this.autoProjection)(d) }
                stroke = "#000"
                strokeWidth = "0.2"
                //fill = "#edc949"
                fill = "transparent"
                //fillOpacity = "0.8"
                className = "inner-boundary"
                />
                )
            })

        }

        let options = []
        chinaProvincesName.forEach((e, i)=>{
            options.push(
                <Option value={e.provincePhonetic} key={`province-${i}`}>{e.provinceName}</Option>
            )
        })

        return (

        <div>
            <div className="Control">
                <p>Basemap</p>
                <Slider defaultValue={30} onAfterChange={this.onAfterChange}/>

                <Select
                    showSearch
                    style={{ width: 200 }}
                    placeholder="Select a province"
                    optionFilterProp="children"
                    onChange={this.onChange.bind(this)}
                    defaultValue={'Hunan'}
                    filterOption={(input, option) =>
                        option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                >
                    { options }
                </Select>

            </div>
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
