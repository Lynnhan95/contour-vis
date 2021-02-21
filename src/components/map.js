import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, scaleSequential, interpolateOrRd, select, nest,scaleLinear} from 'd3'
import { legendColor } from 'd3-svg-legend'
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
const slidingBins = 20

const intersect = require('path-intersection')


// global varibales:

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            /* Render Hunan
            */
            province_en: 'Hunan',
            province_cn: '湖南',

            /* Render Yunnan
            */
            //province_en: 'Yunnan',
            //province_cn: '云南',

            /* Render Sichuan
            */
            //province_en: 'Sichuan',
            //province_cn: '四川',

            currGeoData: [],
            chinaGeoData: [],
            pointsData:[],
            point_ToyData:[],
            resDots: null,
            segment_path_len: 0.1,
            simplifiedContours: null,
            simplifiedOuter: null,
            segmentBoxObjArray: null
        }

        this.svgMargin = 200;
        this.autoProjection = null
        this.svg_w = 1560
        this.svg_h = 1000

        // offset
        this.offset = new Offset()
        this.innerBoundaryCoordinates = null

        // segment
        this.segmentBoxObjArray = []

        // nest data
        this.pointsDataNest = null
        this.pointsToy_DataNest = null
        this.chinaGeoDataNest = null
        this.chinaProvincesNameNest = keyBy(chinaProvincesName, d=>d.provincePhonetic)

        // legend ref
        this.legendRef = React.createRef()
        this.gradientLegendRef = React.createRef()
    }

    onAfterChange = value => {
        this.setState({
          inputValue: value,
        });

    }

    onChange(value) {
        let name_en = value,
            name_cn = this.chinaProvincesNameNest[value].provinceName

        this.setState({
            currGeoData: this.chinaGeoDataNest[name_cn]
        })
        // //console.log(`selected ${name_cn} ${name_en}`);
    }

    /* when component will mount, fetch geojson and csv data locally */
    componentDidMount(){
        let _me = this

        paper.setup('myCanvas')


        //Promise.all([fetch("/chinaGeo-simplify.json"), csv('/religious_data.csv')])
        /* Render Hunan
        */
        Promise.all([fetch("/chinaGeo.geojson"), csv('/hunan_buddhism.csv'), csv('/new_hunan_other.csv')])

        /* Render Yunnan
        */
    //    Promise.all([fetch("/chinaGeo.geojson"), csv('/dots_yunnan.csv')])

        /* Render Sichuan
        */
    //    Promise.all([fetch("/chinaGeo.geojson"), csv('/dots_sichuan.csv')])

            .then(result=>{
                let response = result[0],
                    religious_data = result[1],
                    toy_data = result[2]

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


                /***
                TOY DATA FOR DOUBLE LAYERS
                ***/

                toy_data.forEach(d => {
                    d["id"] = +d["id"];
                    d["Latitude"] = +d["Latitude"]
                    d["Longitude"] = +d["Longitude"]
                    d["year"] = +d["year"]
                })
                let toy_entries = nest()
                    .key(d=>d.province)
                    .entries(toy_data)

                let toy_entriesObj = keyBy(toy_entries, d=>d.key)
                // console.log(toy_entriesObj)

                _me.pointsToy_DataNest = toy_entriesObj

                /**
                 * chinaGeo
                 */
                response.json().then(chinaGeoData => {
                    this.autoProjection = geoMercator().fitExtent([[this.svgMargin*3, this.svgMargin*3],[this.svg_w- this.svgMargin*3 , this.svg_h-this.svgMargin*3]], chinaGeoData)

                    let featuresObj = keyBy(chinaGeoData.features, d=>d.properties.name)

                    _me.chinaGeoDataNest = featuresObj

                    //console.log('Promise currGeoData', _me.chinaGeoDataNest[_me.state.province_cn]);

                    _me.setState ({
                        chinaGeoData: chinaGeoData.features,
                        currGeoData: _me.chinaGeoDataNest[_me.state.province_cn],
                        pointsData: _me.pointsDataNest[_me.state.province_en].values,
                        point_ToyData: _me.pointsToy_DataNest[_me.state.province_en].values
                    })
                })

            })
            .catch(error=>{
                //console.error(error)
            })

        /* Fetching Geo-boundary data from geojson file */
        // fetch("/chinaGeo.geojson")
        //     .then(response => {
        //         if (response.status !== 200){
        //             ////console.log('can not load geojson file')
        //             return
        //         }
        //         response.json().then(chinaGeoData => {
        //             this.autoProjection = geoMercator().fitExtent([[this.svgMargin/2, this.svgMargin/2],[this.svg_w- this.svgMargin/2 , this.svg_h-this.svgMargin/2]], chinaGeoData)

        //             let featuresObj = keyBy(chinaGeoData.features, d=>d.properties.name)
        //             //console.warn('featuresObj', featuresObj);
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
            //////console.log(median)
                MedianPoints.push(median)
        }
        return MedianPoints

    }

    getOuterBoundaryContours(coordinates, num) {
        let contours = []
        const margin = 0.22
        for(let i=1; i< num+1; i++) {
            let offsetContour = new Offset(coordinates).offset(margin* i)
            if (i == 1) {
                this.outerBoundaryCoordinates = offsetContour.filter(e => !!e)
            }
            if (i == 2) {
                this.outerSecondBoundaryCoordinates = offsetContour.filter(e => !!e)
            }

            let outerBoundaryCoordinates = offsetContour.filter(e => !!e)
            let paddinged = {
                type: 'Feature',
                properties: {
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: outerBoundaryCoordinates
                }
            }
            contours.push(paddinged)
        }

        return contours
    }

    getInnerBoundaryContours(coordinates, num) {

        let contours = []
        // HARDCODE 1.89: Api confusion
        // let dist = 0.1/ (num)
        for(let i=1; i< num+1 ; i++) {

            const padding = -0.22           ////console.log(padding)
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

                const d = this.state.currGeoData
                //console.warn('dddddd', d);

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

                _me.state.simplifiedContours = _me.getInnerBoundaryContours(simplifiedArea, 1)
                _me.state.simplifiedOuter = _me.getOuterBoundaryContours(simplifiedArea, 3)

                let even_points = _me.getEvenPointsFromCoordinates(simplifiedArea, 0.05)

                let MedianPoints = _me.getMedianPointsFromEvenPoint(even_points)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // convert boundary to path for computing.
                // get an array of all max inscribled circles [Object:{radius,centerX,centerY}]
                let clip_innerboundary = this.innerBoundaryCoordinates[0].map((d) => {
                    return this.autoProjection(d)
                })

                let simplifiedAreaProjected = simplifiedArea.map((d)=> {return this.autoProjection(d)})
                // svg,pts_ary,segment_num = 5000, extendMetric = 3, plotBoundary= true, inner_pts_ary
                let [circleAry,segPolyList,strPath] = getDensity(select("#myCanvas"),simplifiedAreaProjected, setSegNumb, 3, true, clip_innerboundary)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // get new density second parameter change to new outter contour

                let clip_outterboundary = this.outerBoundaryCoordinates[0].map((d) => {
                    return this.autoProjection(d)
                })

                let clip_outterboundary_second = this.outerSecondBoundaryCoordinates[0].map((d) => {
                    return this.autoProjection(d)
                })

                // console.log(clip_outterboundary_second)

                let [circleAry_out,segPolyList_out,strPath_out] = getDensity(select("#myCanvas"),clip_outterboundary, setSegNumb,5, true, clip_outterboundary)
                let [circleAry_out_second,segPolyList_second_out,strPath_second_out] = getDensity(select("#myCanvas"),clip_outterboundary_second,setSegNumb, 20, true, clip_outterboundary_second)

                // console.log(segPolyList_second_out, strPath_second_out)
                // console.log(segPolyList_out);
                // console.log(segPolyList_second_out);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // create new segList by clipping from mainArea polygon
                let clip_boundary = simplifiedArea.map((d) => {
                    return this.autoProjection(d)
                })

                let newSegPolyList = []

                segPolyList.forEach((d,i) => {
                  let newSegPoly = getNewSeg(d,strPath,i)

                  newSegPolyList.push(newSegPoly)

                })


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                let newSegPolyList_out = []

                segPolyList_out.forEach((d,i) => {
                  let newSegPoly = getNewSeg(d,strPath_out,i)

                  newSegPolyList_out.push(newSegPoly)

                })

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                let newSegPolyListSecond_out = []

                segPolyList_second_out.forEach((d,i) => {
                    let newSegPolySecond = getNewSeg(d,strPath_second_out,i)

                    newSegPolyListSecond_out.push(newSegPolySecond)
                })

// console.log(newSegPolyListSecond_out)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
            subsegments
*/

                let subSegList = []
                const subSegNum = 40 // set how many subsegments we divide each seg
                newSegPolyList.forEach((d,i) => {

                    let subSeg = interpolateSegment(d, subSegNum,i)
                    subSegList.push(subSeg)

                })

                let subSegList_out = []
                newSegPolyList_out.forEach((d,i) => {

                    let subSeg = interpolateSegment(d, subSegNum,i)
                    subSegList_out.push(subSeg)

                })

                let subSegListSecond_out = []
                newSegPolyListSecond_out.forEach((d,i) => {

                    let subSeg = interpolateSegment(d, subSegNum, i)
                    subSegListSecond_out.push(subSeg)
                })

            //   console.log(subSegListSecond_out)



/*
            belt
*/
                //Compute belt from newSegPolyList

                // console.log(clip_innerboundary)
                this.clip_boundary = clip_innerboundary

                let beltSegList = []
                segPolyList.forEach((d, i) => {
                    let beltSeg = getBeltSeg(d, strPath, clip_innerboundary, i,false)
                    beltSegList.push(beltSeg)
                })


                let beltSegList_out = []
                segPolyList_out.forEach((d, i) => {
                    let beltSeg = getBeltSeg(d, strPath_out, strPath, i, true)
                    beltSegList_out.push(beltSeg)
                })

                let beltSegListSecond_out = []
                segPolyList_second_out.forEach((d, i) => {
                    let beltSeg = getBeltSeg(d, strPath_second_out, strPath, i, true)
                    beltSegListSecond_out.push(beltSeg)
                })
                console.log(beltSegListSecond_out)



/*
            belt cells

*/
                let beltCellList = []
                beltSegList.forEach((d) => {
                    let subCell = interpolateSegment(d, subSegNum)
                    beltCellList.push(subCell)
                })

                let beltCellList_out = []
                beltSegList_out.forEach((d) => {
                    let subCell = interpolateSegment(d, subSegNum)
                    beltCellList_out.push(subCell)
                })

                let beltCellListSecond_out = []
                beltSegListSecond_out.forEach((d) => {
                    let subCell = interpolateSegment(d, subSegNum)
                    beltCellListSecond_out.push(subCell)
                })

                ////console.log(beltCellList)


                //let beltSeg = getBeltSegment(segPoly, clip_boundary)
                console.log(beltCellListSecond_out)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                // ////console.log(MedianPoints)

                // let MedianVerticalPoints = _me.getVerticalPathFromEvenPoint(even_points)
                //////console.log(MedianVerticalPoints)

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
                    subSegList_out:subSegList_out,
                    subSegListSecond_out: subSegListSecond_out,
                    beltCellList: beltCellList,
                    beltCellList_out: beltCellList_out,
                    beltCellListSecond_out: beltCellListSecond_out,
                    beltSegList:beltSegList,
                    segPolyList: segPolyList,
                    beltSegList_out: beltSegList_out,
                    segPolyList_out: segPolyList_out,
                    newSegPolyList:newSegPolyList,
                    clip_boundary: clip_boundary

                    // paper_inter: nk_intersect_points[1],
                    //segments: segments,
                    //boundary_segments: boundary_segments
                })
            // }
            // })
        }

        // function calDistanceBetweenPoints(coord1, coord2) {
        //     let distance = 0
        //     let [x1, y1] = coord1
        //     let [x2, y2] = coord2
        //     distance = Math.pow( (x2 -x1)* (x2 -x1) + (y2-y1)*(y2-y1), 0.5 )
        //     //console.log(distance)
        //     return distance
        // }

        function deleteDuplicate(arr) {
            var uniques = [];
            var itemsFound = {};
            for(var i = 0, l = arr.length; i < l; i++) {
                var stringified = JSON.stringify(arr[i]);
                if(itemsFound[stringified]) { continue; }
                uniques.push(arr[i]);
                itemsFound[stringified] = true;
            }
            return uniques;
        }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if ((prevState.subSegList !== this.state.subSegList) && (prevState.subSegList_out !== this.state.subSegList_out)) {
            //console.log('pointsData update', this.state.subSegList)
            var pointsDataProjected = this.state.pointsData.map((e) => {

                return _me.autoProjection([ e.Longitude, e.Latitude ])
            })

            let point_ToyData_first = this.state.point_ToyData.filter((e) => {
                return e.Name_Type === "Daoism"
            })
            let point_ToyData_second = this.state.point_ToyData.filter((e) => {
                return e.Name_Type !== "Daoism"
            })

            var points_ToyDataProjected = point_ToyData_first.map((e) => {

                return _me.autoProjection([ e.Longitude, e.Latitude ])
            })

            var points_ToyDataProjected_second = point_ToyData_second.map((e) => {

                return _me.autoProjection([ e.Longitude, e.Latitude ])
            })

            // console.log(points_ToyDataProjected);

            let deleteDuplicatePoints = deleteDuplicate(pointsDataProjected)
            let deleteDuplicate_TpyPoints = deleteDuplicate(points_ToyDataProjected)
            let deleteDuplicate_TpyPoints_second = deleteDuplicate(points_ToyDataProjected_second)

            // console.log( deleteDuplicatePoints )
            //console.log(pointsDataProjected)
            // console.log(deleteDuplicate_TpyPoints)

            // var [densityGroup, areGroup] = insideCounter(this.state.subSegList,pointsDataProjected,setSegNumb,slidingBins)
            var [densityGroup, areGroup] = insideCounter(this.state.subSegList, this.state.beltCellList,deleteDuplicatePoints,setSegNumb,slidingBins)
            var [densityGroup2, areGroup2] = insideCounter(this.state.subSegList_out, this.state.beltCellList_out,deleteDuplicate_TpyPoints,setSegNumb,slidingBins)
            var [densityGroup3, areGroup3] = insideCounter(this.state.subSegListSecond_out, this.state.beltCellListSecond_out,deleteDuplicate_TpyPoints_second,setSegNumb,slidingBins)

            //console.log(densityGroup);
/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////after getting the density, we need to adjust the values based on empirical settings/////
///////////////slidng window and scaler are applied


            var cellGroup = this.state.beltCellList
            var cellGroup2 = this.state.beltCellList_out
            var cellGroup3 = this.state.beltCellListSecond_out
            ////console.log(cellGroup[0], densityGroup[0])
            let cellObjArr = []
            let cellObjArr2 = []
            let cellObjArr3 = []

            for(let i=0; i< densityGroup.length; i++) {
                for(let j=0; j< densityGroup[i].length; j++) {
                    let cellObj = {}
                    cellObj.coor = cellGroup[i][j]
                    cellObj.dens = densityGroup[i][j]
                    cellObjArr.push(cellObj)
                }
            }



//////////////////////////////////////////////////////// draw second belt

              for(let i=0; i< densityGroup2.length; i++) {
                  for(let j=0; j< densityGroup2[i].length; j++) {
                      let cellObj = {}
                      cellObj.coor = cellGroup2[i][j]
                      cellObj.dens = densityGroup2[i][j]
                      cellObjArr2.push(cellObj)
                  }
              }

//////////////////////////////////////////////////////// draw third belt

            for(let i=0; i< densityGroup3.length; i++) {
                for(let j=0; j< densityGroup3[i].length; j++) {
                    let cellObj = {}
                    cellObj.coor = cellGroup3[i][j]
                    cellObj.dens = densityGroup3[i][j]
                    cellObjArr3.push(cellObj)
                }
            }
            console.log(cellObjArr3)

//////////////////////////////////////////////////draw legend

            let cell_extent = extent(cellObjArr, (d)=>{
                return d.dens
            })

            // console.log(cell_extent);
            let deltaColor = (cell_extent[1]-cell_extent[0])/9
            let colors = []
            // for (var i = 0; i < 9; i++) {
            //   var temp = cell_extent[0]+i*deltaColor
            //   colors.push(temp)
            // }

//////////////////////////////////////////////////draw legend

            let cell_extent2 = extent(cellObjArr2, (d)=>{
                return d.dens
            })

            let cell_extent3 = extent(cellObjArr3, (d)=>{
                return d.dens
            })

            // console.log(cell_extent2);
            let maxAll;
            // if (cell_extent2[1]>cell_extent[1]) {
            //   maxAll = cell_extent2[1]
            // }
            // else {
            //   maxAll = cell_extent[1]
            // }
            console.log(cell_extent, cell_extent2, cell_extent3)
            maxAll = Math.max(cell_extent[1], cell_extent2[1], cell_extent3[1])
            console.log(maxAll)

            let deltaColor2 = (maxAll-cell_extent[0])/9
            let colors2 = []
            for (var i = 0; i < 9; i++) {
              var temp = cell_extent[0]+i*deltaColor2
              colors.push(temp)
            }

///////////////////////////////////////////////////////////////////////////////

            this.color_scale = scaleLinear()
                                .domain(colors)
                                .range(["#d3d3d3","#2c7bb6","#00ccbc","#90eb9d","#ffff8c",
                                        "#f9d057","#f29e2e","#e76818","#d7191c"]);

            this.color_scale2 = scaleLinear()
                                .domain(colors2)
                                .range(["#d3d3d3","#2c7bb6","#00ccbc","#90eb9d","#ffff8c",
                                        "#f9d057","#f29e2e","#e76818","#d7191c"]);




          this.legend = legendColor().scale(this.color_scale).cells([0, 200, 400, 600, 800, 1000, 1200, 1400, 1500])
          // console.log('colorscale', )
           /////////////Create cell legend/////////////////////
           const node = this.legendRef.current
        //    console.log("node", node)
           select(node)
               .call(this.legend)

           ////////////Create gradient legend /////////////////
           var color_scheme = [
               '#2c7bb6',
               '#00a6ca',
               '#00ccbc',
               '#90eb9d',
               '#ffff8c',
               '#f9d057',
               '#f29e2e',
               '#e76818',
               '#d7191c' ];
           const gradientNode = this.gradientLegendRef.current
           const element =
           select(gradientNode)
               // .attr('width', 50)
               // .attr('height', 300)

           element.append('rect')
           .attr('x', 100)
           .attr('y', 0)
           .attr('width', 20)
           .attr('height', 165)
           .style('fill', 'url(#grad)');

           let grad = element.append('defs')
           .append('linearGradient')
           .attr('id', 'grad')
           .attr('x1', '0%')
           .attr('x2', '0%')
           .attr('y1', '0%')
           .attr('y2', '100%');

           grad.selectAll('stop')
           .data(color_scheme)
           .enter()
           .append('stop')
           .style('stop-color', function(d){ return d; })
           .attr('offset', function(d,i){
             return 100 * (i / (colors.length - 1)) + '%';
           })


            this.setState({
                cellObjArr: cellObjArr,
                cellObjArr2:cellObjArr2,
                cellObjArr3:cellObjArr3,
            })


        }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (prevState.inputValue !== this.state.inputValue) {
            //console.log(this.state.inputValue)
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

                if (i == 300 || i===600 || i === 2000 || i === 2700|| i === 3500 )
                { return (
                        <circle
                        cx = {d.centerX }
                        cy = {d.centerY}
                      //  r =  {0.1}// only plot the centers
                        r = {d.radius}
                        stroke = "#000"
                        fill = "none"
                        strokeWidth = "0.5"
                        />
                    )}
                })
            }
            // console.log(this.clip_boundary)
            let clip_boundary
            if(this.state.clip_boundary) {
                clip_boundary = <path

                className = "clip-boundary"
                key = {'clip-boundary'}
                d = { getLinePathStr(this.clip_boundary)}
                stroke = "black"
                strokeWidth = "0.1"
                fill = 'none'

             />
            }

            // this.clip_boundary

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
            //         //console.log(d)
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

            let cells0,cells1,cells2, cells3
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

            }

            if(this.state.cellObjArr2){
              cells2 = this.state.cellObjArr2.map((d, i) => {
                  let pathStr0 = getLinePathStr(d.coor)

                    return (
                        <path
                        key = {`split_boundary_segments2-${i}`}
                        className = {`split_boundary_segments2-${i}`}
                        d = {pathStr0}
                        fill = {this.color_scale(d.dens)}
                        />
                    )

              })
            }

            if(this.state.cellObjArr3){
                cells3 = this.state.cellObjArr3.map((d, i) => {
                    let pathStr0 = getLinePathStr(d.coor)
  
                      return (
                          <path
                          key = {`split_boundary_segments3-${i}`}
                          className = {`split_boundary_segments3-${i}`}
                          d = {pathStr0}
                          fill = {this.color_scale(d.dens)}
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
                if(d.properties.name === this.state.province_cn){
                    //////console.log(d)fitExtent([this.svgMargin/2, this.svgMargin/2],[_me.svg_w- this.svgMargin/2 , _me.svg_h-this.svgMargin/2], chinaGeoData)
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
                    //simplified_Outboundary,
                    // inscribledCircles,
                    //clip_boundary
                    //linePts,
                    cells0,
                    // cells1,
                    cells2,
                    cells3,
                    //segPoly
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
            fill="#0000A0"
            r = "0.6"
            />
            )
        })

        const Toy_Dots = this.state.point_ToyData.map((d,i) => {
            return (
            <circle
            key = {`dot-${ i }`}
            cx = { this.autoProjection([ d.Longitude, d.Latitude ])[0]}
            cy = { this.autoProjection([ d.Longitude, d.Latitude ])[1]}
            fill="red"
            r = "0.6"
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
            ////console.log('render simplifiedContours', this.state.simplifiedContours)
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

        let outerBoundary
        if(this.state.simplifiedOuter){
            //console.log('render simplifiedContours', this.state.simplifiedContours)
            outerBoundary =
            this.state.simplifiedOuter.map((d, i) => {
            return (
            <path
                key = {`contours-${i}`}
                d = { geoPath().projection(this.autoProjection)(d) }
                stroke = "#000"
                strokeWidth = "0.2"
                // fill = "#edc949"
                fill = "transparent"
                //fillOpacity = "0.8"
                className = "outter-boundary"
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
            {/* <div className="Control">
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

            </div> */}
            <svg id="myCanvas" width = {this.svg_w} height = {this.svg_h} viewBox = {`0 0 ${this.svg_w} ${this.svg_h}`}>
            <g className="Regions">
                {Regions}
            </g>
             <g className="Dots">
                {Dots}
            </g>

            <g className="toy_Dots">
               {Toy_Dots}
           </g>
            <g className="test_near">
                {test_near}
            </g>
            {/* <g className="innerBoundary">
                {innerBoundary}
            </g> */}
            {/* <g className="outerBoundary">
                {outerBoundary}
            </g> */}
            <g className = "legend" ref = {this.legendRef}>

            </g>
            <g className = "gradientLegend" ref = {this.gradientLegendRef}>

            </g>
            </svg>
            {/* <CountPoint mainArea = {this.state.mainArea} points = {this.state.pointsData}/> */}
        </div>

        )

    }
}

export default BaseMap;
