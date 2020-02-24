import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, select, nest, scaleLinear, path } from 'd3'
import { legendColor } from 'd3-svg-legend'
import Offset from 'polygon-offset'
import simplify from 'simplify-js'
import paper from 'paper'
import MapColor from './mapColor'
import {getDensity} from "./getDensity"
import {interpolateSegment} from './interpolateSegment'
import {insideCounter} from './insideCounter'
import {getNewSeg} from './getNewSeg.js'
import {getBeltSeg} from './getBeltSeg.js'
import "./style.css"
import keyBy from 'lodash.keyby'
import HeatMap from './heatmap.js'

import rect_sample9 from './training_data/rect/rect_sample9.js'
import circle_sample1 from './training_data/circle/circle_sample1.js'

const setSegNumb = 1000
const slidingBins = 8


// global varibales:

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
            currGeoData: [],
            chinaGeoData: [],
            pointsData:[],
            resDots: null,
            segment_path_len: 0.1,
            simplifiedContours: null,

            segmentBoxObjArray: null,

            // New
            rect1_cells: null
        }

        this.svgMargin = 50;
        this.autoProjection = geoMercator()
        this.svg_w = 400
        this.svg_h = 300

        // offset
        this.offset = new Offset()
        this.innerBoundaryCoordinates = null

        // segment
        this.segmentBoxObjArray = []

        // legend ref
        this.legendRef = React.createRef()
        this.gradientLegendRef = React.createRef()

        // contour
        this.contour_num = 5
        this.contour_padding_len = -4.2
        this.contour_padding_len_unit = -0.007


        // New
        this.svg_list = null
    }

    /* when component will mount, fetch geojson and csv data locally */
    componentDidMount(){
        let _me = this

        paper.setup('mySvg')

        /**
         * prepare
         */
        this.svg_list = select('#svg_list')

        /**
         * Start draw
         */
        _me.drawOneMap(rect_sample9, 'rect')
      
        // _me.drawOneMap(circle_sample1, 'circle')

        // Promise
        //     .all([fetch("/chinaGeo.geojson"), csv('/religious_data_all.csv')])
        //     .then(result=>{
        //         let response = result[0],
        //             religious_data = result[1]

        //         /**
        //          * religious_data
        //          */
        //         religious_data.forEach(d => {
        //             d["id"] = +d["id"];
        //             d["Latitude"] = +d["Latitude"]
        //             d["Longitude"] = +d["Longitude"]
        //             d["year"] = +d["year"]
        //         })
        //         let entries = nest()
        //             .key(d=>d.province)
        //             .entries(religious_data)

        //         let entriesObj = keyBy(entries, d=>d.key)

        //         _me.pointsDataNest = entriesObj

        //         /**
        //          * chinaGeo
        //          */
        //         response.json().then(chinaGeoData => {
        //             // this.autoProjection = geoMercator().fitExtent([[this.svgMargin*3, this.svgMargin*3],[this.svg_w- this.svgMargin*3 , this.svg_h-this.svgMargin*3]], chinaGeoData)

        //             let featuresObj = keyBy(chinaGeoData.features, d=>d.properties.name)

        //             _me.chinaGeoDataNest = featuresObj

        //             // console.log('Promise currGeoData', _me.chinaGeoDataNest);

        //             _me.setState ({
        //                 chinaGeoData: chinaGeoData.features,
        //                 currGeoData: _me.chinaGeoDataNest[_me.state.province_cn],
        //                 pointsData: _me.pointsDataNest[_me.state.province_en].values
        //             })
        //         })

        //     })
        //     .catch(error=>{
        //         //console.error(error)
        //     })
    }

    /* Helper function for getting even_point */
    calcDistanceFromTwoPoints(point1, point2) {
        let [x0, y0] = point1,
            [x1, y1] = point2

        return Math.sqrt((x0 - x1)*(x0 - x1) + (y0 - y1)*(y0 - y1))
    }

    getInnerBoundaryContours(coordinates, num, contour_padding_len) {
        console.log('getInnerBoundaryContours coordinates', coordinates);
        
        let contours = [],
            padding = (contour_padding_len / num)
        // TODO: calculate the correct contour_padding_len
        this.offset.data(coordinates)
        // const padding = (-1.6/num)
        // HARDCODE 1.89: Api confusion
        // let dist = 0.1/ (num)
        let offsetContour = this.offset.offset(padding)
        this.innerBoundaryCoordinates = offsetContour.filter(e => !!e)

        contours.push(this.innerBoundaryCoordinates)

        return contours
    }

    drawRectPath(shape_data) {
        let context = path()

        context.rect(shape_data.x, shape_data.y, shape_data.width, shape_data.height)
      
        return context
    }
      
    drawCirclePath(shape_data) {
        let context = path()

        context.arc(shape_data.x + shape_data.r, shape_data.y + shape_data.r, shape_data.r, 0, Math.PI * 2)
        
        return context
    }

    getPaddingBoundaryPath(matrix, type){
        let padding_len = 30,
            new_matrix = {}

        switch (type) {
            case 'rect':
                new_matrix.x = matrix.x + padding_len
                new_matrix.y = matrix.y + padding_len
                new_matrix.width = matrix.width - padding_len * 2
                new_matrix.height = matrix.height - padding_len * 2

                return this.drawRectPath(new_matrix)

            case 'circle':
                new_matrix.x = matrix.x
                new_matrix.y = matrix.y
                new_matrix.r = matrix.r - padding_len

                return this.drawCirclePath(new_matrix)
        
            default:
                break;
        }
    }

    pointsObjToArr(points){
        return points.map(d=>{
            return [d.x, d.y]
        })
    }

    drawOneMap(map_data, type){
        console.log(map_data)
        let matrix = map_data.matrix
        const dot_margin = 30
        // create a new svg
        let svg = this.svg_list.append('svg')
        let svg_dot = this.svg_list.append('svg')
                            
        switch (type) {
            case 'rect':
                svg
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('viewBox', `${matrix.x} ${matrix.y} ${matrix.width} ${matrix.height}`)
                svg_dot
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('viewBox', `${matrix.x} ${matrix.y} ${matrix.width} ${matrix.height}`)
                    .attr('class', 'svg_dot')

                break;

            case 'circle':
                svg
                    .attr('width', matrix.r * 2)
                    .attr('height', matrix.r * 2)
                    .attr('viewBox', `${matrix.x} ${matrix.y} ${matrix.r * 2} ${matrix.r * 2}`)
                break;
        
            default:
                break;
        }

        let [circleAry, segPolyList, strPath] = getDensity(
            svg,
            matrix,
            setSegNumb,
            type  // 'rect' or 'circle'
        )
        // console.log('TEST strPath', strPath, segPolyList)

        let newSegPolyList = []
        segPolyList.forEach((d, i) => {
            let newSegPoly = getNewSeg(d, strPath, i)

            newSegPolyList.push(newSegPoly)
        })
        // console.log('newSegPolyList', newSegPolyList)

        /**
         * divide newSegPoly for count inner points
        */
        let subSegList = []
        let subSegNum = 10 // set how many subsegments we divide each seg
        newSegPolyList.forEach((d,i) => {
            let subSeg = interpolateSegment(d, subSegNum)

            subSegList.push(subSeg)
        })
        // console.log('subSegList', subSegList)

        /**
         * calc padding boundary
         */
        let clip_boundary = this.getPaddingBoundaryPath(matrix, type)
        let beltSegList = []
        segPolyList.forEach((d, i) => {
            let beltSeg = getBeltSeg(d, strPath, clip_boundary)

            beltSegList.push(beltSeg)
        })
        // console.log('beltSegList', beltSegList)

        /**
         * divide beltSeg for map color
         */
        let beltCellList = []
        beltSegList.forEach((d) => {
            let subCell = interpolateSegment(d, subSegNum)

            beltCellList.push(subCell)
        })
        // console.log('beltCellList', beltCellList)

        /**
         * Count inner points as density
         */
        let points = this.pointsObjToArr(map_data.dots)
        let [densityGroup, areGroup] = insideCounter(subSegList, beltCellList, points, setSegNumb, slidingBins)
        // console.log('insideCounter', densityGroup)

        /**
         * calc drawing cell obj
         */
        let cellObjArr = []
        for(let i=0; i< densityGroup.length; i++) {
            for(let j=0; j< densityGroup[i].length; j++) {
                let cellObj = {}
                cellObj.coor = beltCellList[i][j]
                cellObj.dens = densityGroup[i][j]
                cellObjArr.push(cellObj)
            }
        }

        /**
         * calc cell color scale
         */
        let cell_extent = extent(cellObjArr, (d)=>{
            return d.dens
        })
        let deltaColor = (cell_extent[1]-cell_extent[0])/9
        let colors = []
        for (var i = 0; i < 9; i++) {
          var temp = cell_extent[0]+i*deltaColor
          colors.push(temp)
        }

        let color_scale = scaleLinear()
            .domain(colors)
            .range(["#2c7bb6", "#00a6ca","#00ccbc","#90eb9d","#ffff8c","#f9d057","#f29e2e","#e76818","#d7191c"])

        // TODO: 
        cellObjArr.map((d, i) => {
            svg.append('path')
                .attr('class', `cell-${i}`)
                .attr('d', this.getLinePathStr(d.coor))
                .attr('fill', color_scale(d.dens))
        })

        points.map((d, i) => {
            svg_dot.append('circle')
                .attr('cx', d[0])
                .attr('cy', d[1])
                .attr('fill', '#be62d5')
                .attr('r', '.5')
        })

        let pos_arr = this.getPointsArrFromMatrix(rect_sample9.matrix)
        let lineStr = this.getLinePathStr(pos_arr)
        console.log(pos_arr, lineStr)

        svg_dot.append('path')
                .attr('class', 'outline')
                .attr('d', lineStr)
                .attr('stroke', "#000")
                .attr('fill', 'none')

        // circleAry.map((d, i) => {
        //     if ( i % 10 == 0 ) {
        //         console.log(d)
        //         svg.append('circle')
        //             .attr('cx', d.centerX)
        //             .attr('cy', d.centerY)
        //             .attr('stroke', "#000")
        //             .attr('fill', 'none')
        //             .attr('r', d.radius)
        //     }

        // })

        // svg.append('path')
        //     .attr('class', 'outline')
        //     .attr('d', lineStr)
        //     .attr('stroke', "#000")


        // newSegPolyList.map((d=>{
        //     svg.append('path')
        //         .attr('class', `cell-${i}`)
        //         .attr('d', this.getLinePathStr(d))
        //         .attr('fill', 'none')
        //         .attr('stroke', '#000')
        //         .attr('stroke-width', '.1')
        // }))
        // subSegList.map((d=>{
        //     d.map(e=>{
        //         svg.append('path')
        //             .attr('class', `cell-${i}`)
        //             .attr('d', this.getLinePathStr(e))
        //             .attr('fill', 'none')
        //             .attr('stroke', '#000')
        //             .attr('stroke-width', '.1')
        //     })
        // }))

        return cellObjArr
        
    }

    componentDidUpdate(prevPros, prevState){
        let _me = this

        if(prevState.currGeoData !== this.state.currGeoData){

            _me.autoProjection.fitExtent([
                [this.svgMargin / 2, this.svgMargin / 2],
                [this.svg_w - this.svgMargin / 2 , this.svg_h - this.svgMargin / 2]
            ], this.state.currGeoData)
            
            // store computed dots and paths
            const d = this.state.currGeoData
            console.log('currGeoData', d)

            const d_coordinates = d.geometry.coordinates
            const simplifiedFactor = 0.4

            /**
             * Compute simplified area coordinates
             */
            let res = []
            for(let i=0; i< d_coordinates[0].length; i++) {
                let temp = { }
                temp['x'] = d_coordinates[0][i][0]
                temp['y'] = d_coordinates[0][i][1]
                res.push(temp)
            }

            let simplified = simplify(res, simplifiedFactor, true)
            let simplified_coordinates = []
            for(let i=0; i< simplified.length; i++) {
                let temp = []
                temp.push(simplified[i].x)
                temp.push(simplified[i].y)
                simplified_coordinates.push(temp)
            }

            _me.state.simplifiedArea = simplified_coordinates

            // let even_points = _me.getEvenPointsFromCoordinates(simplified_coordinates, 0.05)

            // let MedianPoints = _me.getMedianPointsFromEvenPoint(even_points)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // convert boundary to path for computing.
            // get an array of all max inscribled circles [Object:{radius,centerX,centerY}]

            let simplifiedAreaProjected = simplified_coordinates.map((d)=> {return this.autoProjection(d)})

            let [circleAry,segPolyList,strPath] = getDensity(select("#mySvg"),simplifiedAreaProjected,setSegNumb)
            console.log(circleAry)
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            let newSegPolyList = []

            segPolyList.forEach((d, i) => {
                let newSegPoly = getNewSeg(d, strPath, i)

                newSegPolyList.push(newSegPoly)
            })

            //console.log(newSegPolyList)

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
        subsegments for map color
*/

            let subSegList = []
            const subSegNum = 10 // set how many subsegments we divide each seg
            newSegPolyList.forEach((d,i) => {
                let subSeg = interpolateSegment(d, subSegNum)
                subSegList.push(subSeg)
            })

            /**
             * Compute inner contours
             */
            // _me.state.simplifiedContours = _me.getInnerBoundaryContours(simplified_coordinates, _me.contour_num, 1)
            // console.log('simplifiedContours', _me.state.simplifiedContours)
/*
        belt
*/
            // console.log('innerBoundaryCoordinates', this.innerBoundaryCoordinates)
            //Compute belt from newSegPolyList
            let clip_innerboundary = this.innerBoundaryCoordinates[0].map((d) => {
                return this.autoProjection(d)
            })
            let beltSegList = []
            segPolyList.forEach((d, i) => {
                let beltSeg = getBeltSeg(d, strPath, clip_innerboundary, i)
                beltSegList.push(beltSeg)
            })
            //console.log(beltSegList)
/*
        belt cells

*/
            let beltCellList = []
            beltSegList.forEach((d) => {
                let subCell = interpolateSegment(d, subSegNum)
                beltCellList.push(subCell)
            })
            // console.log(beltCellList)


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            this.setState({
                // rea: mainArea,
                // simplifiedArea: simplifiedArea,
                // even_points: even_points,
                // MedianPoints: MedianPoints,
                inscribledCircles :circleAry,
                linePts : simplifiedAreaProjected,
                subSegList:subSegList,
                beltCellList: beltCellList,
                beltSegList:beltSegList,
                segPolyList: segPolyList,
                newSegPolyList:newSegPolyList
            })
        }

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
        if (prevState.subSegList !== this.state.subSegList) {


            var pointsDataProjected = this.state.pointsData.map((e) => {
                return _me.autoProjection([ e.Longitude, e.Latitude ])
            })

            let deleteDuplicatePoints = deleteDuplicate(pointsDataProjected)
            //console.log(pointsDataProjected)
            //console.log(deleteDuplicatePoints)

            // var [densityGroup, areGroup] = insideCounter(this.state.subSegList,pointsDataProjected,setSegNumb,slidingBins)
            var [densityGroup, areGroup] = insideCounter(this.state.subSegList, this.state.beltCellList,deleteDuplicatePoints,setSegNumb,slidingBins)
            //console.log(densityGroup);
/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////after getting the density, we need to adjust the values based on empirical settings/////
///////////////slidng window and scaler are applied


            var cellGroup = this.state.beltCellList
            ////console.log(cellGroup[0], densityGroup[0])
            let cellObjArr = []
            for(let i=0; i< densityGroup.length; i++) {
                for(let j=0; j< densityGroup[i].length; j++) {
                    let cellObj = {}
                    cellObj.coor = cellGroup[i][j]
                    cellObj.dens = densityGroup[i][j]
                    cellObjArr.push(cellObj)
                }
            }
            let cell_extent = extent(cellObjArr, (d)=>{
                return d.dens
            })
            let deltaColor = (cell_extent[1]-cell_extent[0])/9
            let colors = []
            for (var i = 0; i < 9; i++) {
              var temp = cell_extent[0]+i*deltaColor
              colors.push(temp)
            }

            this.color_scale = scaleLinear()
                .domain(colors)
                .range(["#2c7bb6", "#00a6ca","#00ccbc","#90eb9d","#ffff8c",
                        "#f9d057","#f29e2e","#e76818","#d7191c"]);

            this.legend = legendColor().scale(this.color_scale).cells(10)

            /////////////Create cell legend/////////////////////
            const node = this.legendRef.current
            // console.log("node", node)
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
                .attr('height', 180)
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
                cellObjArr: cellObjArr
            })
            // console.log('cellObjArr', cellObjArr)

        }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (prevState.inputValue !== this.state.inputValue) {
            //console.log(this.state.inputValue)
        }
    }

    getLinePathStr(arr) {
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
    getPointsArrFromMatrix = (matrix) => {
        let pos_arr = [] 
        pos_arr.push([matrix.x, matrix.y])
        pos_arr.push([matrix.x + matrix.width, matrix.y])
        pos_arr.push([matrix.x + matrix.width, matrix.y + matrix.height])
        pos_arr.push([matrix.x, matrix.y + matrix.height])
        pos_arr.push([matrix.x, matrix.y])
        return pos_arr
       }

    render() {
        // define province shapes with chinaGeoData
        let getRegionElements =() =>{

            let inscribledCircles
            if(this.state.inscribledCircles) {
                console.log(this.state.inscribledCircles)
                inscribledCircles = this.state.inscribledCircles.map((d,i) => {

                        return (
                            <circle
                            key = {`inscribledCircles-${i}`}
                            cx = {d.centerX }
                            cy = {d.centerY}
                        //  r =  {0.1}// only plot the centers
                            r = {d.radius}
                            stroke = "#000"
                            fill = "none"
                            strokeWidth = ".1"
                            />
                        )
                })
            }


            // let segPoly
            // if(this.state.segPolyList) {
            //     segPoly = this.state.segPolyList.map((d, i) => {

            //         let pathStr = this.getLinePathStr(d)

            //         return (
            //             <path
            //             key = {`path-${i}`}
            //             className = {`Segment-${i}`}
            //             d = {pathStr}
            //             stroke = "#12f6a2"
            //             strokeWidth = "0.1"
            //             fill = 'none'
            //             />
            //         )
            //     })
            // }

            // let linePts
            // if (this.state.linePts) {
            //   linePts = this.state.linePts.map((d,i) => {
            //       return (
            //       <circle
            //       key = {`dot-${ i }`}
            //       cx = { d[0]}
            //       cy = { d[1]}
            //       fill = "#33ff22"
            //       r = "2"
            //       />
            //       )
            //   })
            // }

            /* Map segments and belt segments (denoted as boundary_segments)
            With this.state.segments and this.state.segmentBoxObjArray data
            Notice: segmentBoxObjArray contains:
                    - boundarySegmentCoordinate
                    - dotCount (dots amount per segment)
            */

            let cells0,cells1,cells2
            if(this.state.cellObjArr){
                console.log('inscribledCircles')
                cells0 = this.state.cellObjArr.map((d, i) => {
                    let pathStr0 = this.getLinePathStr(d.coor)
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
                // cells1 = this.state.subSegList.map((d, i) => {
                //     let pathStr0 = this.getLinePathStr(d[1])
                //       return (
                //           <path
                //           key = {`split_boundary_segments-${i}`}
                //           className = {`split_boundary_segments-${i}`}
                //           d = {pathStr0}
                //           fill = 'green'
                //           // fill = {this.color_scale(d.dens)}
                //           />
                //       )
                
                // })
                // cells2 = this.state.subSegList.map((d, i) => {
                //     let pathStr0 = this.getLinePathStr(d[2])
                //       return (
                //           <path
                //           key = {`split_boundary_segments-${i}`}
                //           className = {`split_boundary_segments-${i}`}
                //           d = {pathStr0}
                //           fill = 'blue'
                //           // fill = {this.color_scale(d.dens)}
                //           />
                //       )

                // })

            }

            /*
            Mapping simplified outer boundary with this.state.simplifiedArea
            Used this.state.even_point before, since we interpolate evenly on out boundary to get segments before
            No longer necessary for Phoenix map based algorithm
            Therefore, changed to simplifiedArea in this branch
             */
            // let simplified_Outboundary
            // if( this.state.simplifiedArea ) {
            //     simplified_Outboundary = MapColor(this.state.simplifiedArea, 1, geoPath().projection(this.autoProjection), 'transparent', 'outBoundary' )

            // }

            let simplified_contours
            if(this.state.simplifiedContours){
                simplified_contours = this.state.simplifiedContours.map((d, i)=>{
                    return <path
                        key = {`simplifiedContours-${i}`}
                        d = { geoPath().projection(this.autoProjection)(d) }
                        stroke = "black"
                        strokeWidth = "1"
                        fill="none"
                        />
                })
            }

            return [
                // outsideBoundary,
                // simplified_Outboundary,
                cells0,
                // cells1,
                // cells2,
                // segPoly,
                inscribledCircles,
                // linePts,
                simplified_contours
            ]
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
        let Heatmap = <HeatMap data = {rect_sample9}/>
                


        return (
            <div>
                <div className="Control">
                    <h1>12 Training Maps</h1>
                </div>
                <svg 
                    id="mySvg" width = "1" height = "1" 
                    viewBox = {`550 100 400 300`}>

                    <g className="Regions">
                        {Regions}
                    </g>
                    <g className="Dots">
                        {Dots}
                    </g>
                    <g className = "legend" ref = {this.legendRef}>

                    </g>
                    <g className = "gradientLegend" ref = {this.gradientLegendRef}>

                    </g>
                    <path id="calc_path"></path>
                </svg>
                <div id="svg_list">
                    <div className="heatmapContainer">
                        { Heatmap }
                    </div>
                </div>


            </div>
        )
    }
}

export default BaseMap;
