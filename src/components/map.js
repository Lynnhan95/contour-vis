import React, { Component } from "react"
import { geoPath, geoMercator } from "d3-geo"
import { csv, extent, select, nest, scaleLinear, path } from 'd3'
import { legendColor } from 'd3-svg-legend'
import Offset from 'polygon-offset'
import simplify from 'simplify-js'
import paper from 'paper'
import MapColor from './mapColor'
import {getDensity} from "./getDensity"
import getCircleDensity from './getCircleDensity'
import {interpolateSegment} from './interpolateSegment'
import {insideCounter} from './insideCounter'
import {getNewSeg} from './getNewSeg.js'
import {getBeltSeg} from './getBeltSeg.js'
import "./style.css"
import keyBy from 'lodash.keyby'
import HeatMap from './heatmap.js'
import rect_sample9 from './training_data/rect/rect_sample9.js'
import circle_sample1 from './training_data/circle/circle_sample1.js'
import nut_sample1 from './training_data/nut/nut_sample1.js'

const setSegNumb = 1000
const slidingBins = 50


// global varibales:

class BaseMap extends Component {
    constructor(){
        super();
        this.state = {
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


    }

    /* when component will mount, fetch geojson and csv data locally */
    componentDidMount(){
        let _me = this

        paper.setup(document.createElement('canvas'))

        /**
         * prepare
         */
        // this.svg_list = select('#svg_list')

        /**
         * Start draw
         */
        _me.drawOneMap(select('#rect9_box'), rect_sample9, 'rect')
      
        _me.drawOneMap(select('#circle1_box'), circle_sample1, 'circle')

        _me.drawOneMap(select('#nut1_box'), nut_sample1, 'nut')

    }

    drawRectPath(shape_data) {
        let context = path()

        context.rect(shape_data.x, shape_data.y, shape_data.width, shape_data.height)
      
        return context
    }
      
    drawCirclePath(shape_data) {
        let context = path()

        context.arc(shape_data.x, shape_data.y, shape_data.r, 0, Math.PI * 2)
        
        return context
    }
    drawpolygonPath(shape_polygon) {
        console.log(shape_polygon)
        let context = path()
        context.moveTo(shape_polygon[0][0], shape_polygon[0][1])
        for(let i= 1; i< shape_polygon.length; i++) {
          context.lineTo(shape_polygon[i][0], shape_polygon[i][1])
        }
        console.log(context)
        return context
    }

    getPaddingBoundaryPath(matrix, type, polygon){
        let padding_len = 30,
            new_matrix = {}

        switch (type) {
            case 'rect':
                new_matrix.x = matrix.x + padding_len
                new_matrix.y = matrix.y + padding_len
                new_matrix.width = matrix.width - padding_len * 2
                new_matrix.height = matrix.height - padding_len * 2
                console.log(this.drawRectPath(new_matrix))
                return this.drawRectPath(new_matrix)

            case 'circle':
                new_matrix.x = matrix.x
                new_matrix.y = matrix.y
                new_matrix.r = matrix.r - padding_len

                return this.drawCirclePath(new_matrix)

            case 'nut':
                const offsetPadding = -0.3
                let new_polygon = new Offset(polygon).offset(offsetPadding)
                // console.log(temp)
                // new_matrix.x = matrix.x + padding_len
                // new_matrix.y = matrix.y + padding_len
                // new_matrix.width = matrix.width - padding_len * 2
                // new_matrix.height = matrix.height - padding_len * 2
                return this.drawpolygonPath(new_polygon[0])

        
            default:
                break;
        }
    }

    pointsObjToArr(points){
        return points.map(d=>{
            return [d.x, d.y]
        })
    }

    drawOneMap(box, map_data, type){

        let matrix = map_data.matrix
        let polygon = map_data.polygon
        if(type === "nut") {
            console.log(matrix)
        }

        // create a new svg
        let svg = box.append('svg')
        let svg_dot = box.append('svg')

        let circleAry, segPolyList, strPath
                            
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

                let [arg1, arg2, arg3] = getDensity(
                    svg,
                    matrix,
                    setSegNumb,
                    type  // 'rect' or 'circle'
                )
                circleAry = arg1
                segPolyList = arg2
                strPath = arg3

                break;

            case 'nut':
                console.log('nut ready')
                svg
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('viewBox', `${matrix.x} ${matrix.y} ${matrix.width} ${matrix.height}`)

                svg_dot
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('viewBox', `${matrix.x} ${matrix.y} ${matrix.width} ${matrix.height}`)
                    .attr('class', 'svg_dot')

                let [arg111, arg222, arg333] = getDensity(
                    svg,
                    matrix,
                    setSegNumb,
                    type, // 'rect' or 'circle' or 'nut'
                    polygon
                )

                circleAry = arg111
                segPolyList = arg222
                strPath = arg333

                break;

            case 'circle':
                svg
                    .attr('width', matrix.r * 2)
                    .attr('height', matrix.r * 2)
                    .attr('viewBox', `${matrix.x - matrix.r} ${matrix.y - matrix.r} ${matrix.r * 2} ${matrix.r * 2}`)

                svg_dot
                    .attr('width', matrix.r * 2)
                    .attr('height', matrix.r * 2)
                    .attr('viewBox', `${matrix.x - matrix.r} ${matrix.y - matrix.r} ${matrix.r * 2} ${matrix.r * 2}`)
                    .attr('class', 'svg_dot')

                let [arg22, arg33] = getCircleDensity(
                    svg,
                    matrix,
                    setSegNumb,
                    type  // 'rect' or 'circle'
                )
                segPolyList = arg22
                strPath = arg33

                break;
        
            default:
                break;
        }



        /**
         * divide newSegPoly for count inner points
        */
        let subSegList = []
        let subSegNum = 10 // set how many subsegments we divide each seg
        segPolyList.forEach((d,i) => {
            let subSeg = interpolateSegment(d, subSegNum)

            subSegList.push(subSeg)
        })
        // console.log('subSegList', subSegList)
        // subSegList.map((d=>{
        //     d.map((e, i)=>{
        //         svg.append('path')
        //             .attr('class', `cell-${i}`)
        //             .attr('d', this.getLinePathStr(e))
        //             .attr('fill', 'none')
        //             .attr('stroke', '#000')
        //             .attr('stroke-width', '.1')
        //     })
        // }))
        if (type === "nut") {
            console.log(segPolyList)
        }
        /**
         * calc padding boundary
         */
        let clip_boundary = this.getPaddingBoundaryPath(matrix, type, polygon)
        // svg.append('path')
        //     .attr('d', clip_boundary.toString())
        //     .attr('fill', 'none')
        //     .attr('stroke', '#000')
        //     .attr('stroke-width', '1')
        let beltSegList = []
        segPolyList.forEach((d, i) => {
            
            let beltSeg = getBeltSeg(d, strPath, clip_boundary, type)

            beltSegList.push(beltSeg)
        })

        // console.log('beltSegList', beltSegList)
        // beltSegList.map((d=>{
        //     d.map((e, i)=>{
        //         svg.append('path')
        //             .attr('class', `cell-${i}`)
        //             .attr('d', this.getLinePathStr(e))
        //             .attr('fill', 'none')
        //             .attr('stroke', '#000')
        //             .attr('stroke-width', '.1')
        //     })
        // }))


    
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
        let [densityGroup, areGroup] = insideCounter(subSegList, beltCellList, points, setSegNumb, slidingBins, 50, type)
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

        
        /**
         * Draw the final map
         */
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


        /**
         * Draw outline
         */
        switch (type) {
            case 'rect':
                svg_dot.append('rect')
                    .attr('x', matrix.x)
                    .attr('y', matrix.y)
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('fill', 'none')
                    .attr('stroke', '#000')
                    .attr('stroke-width', '#000')

                svg.append('rect')
                    .attr('x', matrix.x)
                    .attr('y', matrix.y)
                    .attr('width', matrix.width)
                    .attr('height', matrix.height)
                    .attr('fill', 'none')
                    .attr('stroke', '#000')
                    .attr('stroke-width', '#000')

                break;

            case 'circle':
                svg_dot.append('circle')
                    .attr('cx', matrix.x)
                    .attr('cy', matrix.y)
                    .attr('r', matrix.r)
                    .attr('fill', 'none')
                    .attr('stroke', '#000')
                    .attr('stroke-width', '#000')

                svg.append('circle')
                    .attr('cx', matrix.x)
                    .attr('cy', matrix.y)
                    .attr('r', matrix.r)
                    .attr('fill', 'none')
                    .attr('stroke', '#000')
                    .attr('stroke-width', '#000')

                break;

                case 'nut':
                    svg_dot.append('rect')
                        .attr('x', matrix.x)
                        .attr('y', matrix.y)
                        .attr('width', matrix.width)
                        .attr('height', matrix.height)
                        .attr('fill', 'none')
                        .attr('stroke', '#000')
                        .attr('stroke-width', '#000')
    
                    svg.append('rect')
                        .attr('x', matrix.x)
                        .attr('y', matrix.y)
                        .attr('width', matrix.width)
                        .attr('height', matrix.height)
                        .attr('fill', 'none')
                        .attr('stroke', '#000')
                        .attr('stroke-width', '#000')
    
                    break;
        
            default:
                break;
        }

        // let pos_arr = this.getPointsArrFromMatrix(rect_sample9.matrix)
        // let lineStr = this.getLinePathStr(pos_arr)
        // console.log(pos_arr, lineStr)

        // svg_dot.append('path')
        //         .attr('class', 'outline')
        //         .attr('d', lineStr)
        //         .attr('stroke', "#000")
        //         .attr('fill', 'none')

        // svg.append('path')
        //     .attr('class', 'outline')
        //     .attr('d', lineStr)
        //     .attr('stroke', "#000")
        //     .attr('fill', 'none')

        return cellObjArr
        
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

    getPointsArrFromMatrix(matrix) {
        let pos_arr = [] 
        pos_arr.push([matrix.x, matrix.y])
        pos_arr.push([matrix.x + matrix.width, matrix.y])
        pos_arr.push([matrix.x + matrix.width, matrix.y + matrix.height])
        pos_arr.push([matrix.x, matrix.y + matrix.height])
        pos_arr.push([matrix.x, matrix.y])
        return pos_arr
    }

    render() {
        
        let HeatmapRect9 = <HeatMap data = {rect_sample9} type="rect" />
        let HeatmapCircle1 = <HeatMap data = {circle_sample1} type="circle" />
        let HeatmapNut1 = <HeatMap data = {nut_sample1} type="nut" />


        return (
            <div>
                <div className="Control">
                    <h1>12 Training Maps</h1>
                </div>
                <div id="svg_list">
                    <div id="rect9_box" className="heatmapContainer">
                        { HeatmapRect9 }
                    </div>

                    <div id="circle1_box" className="heatmapContainer">
                        { HeatmapCircle1 }
                    </div>
                    
                    <div id="nut1_box" className="heatmapContainer">
                        { HeatmapNut1 }
                    </div>
                    
                </div>
            </div>
        )
    }
}

export default BaseMap;
