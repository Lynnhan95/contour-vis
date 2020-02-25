/*
 * @Author: Nokey 
 * @Date: 2020-02-25 15:52:31 
 * @Last Modified by: Mr.B
 * @Last Modified time: 2020-02-25 19:36:37
 */

import * as d3 from 'd3'

function drawCircle(context, shape_data) {
    // context.arc(shape_data.x + shape_data.r, shape_data.y + shape_data.r, shape_data.r, 0, Math.PI * 2)
    context.arc(shape_data.x, shape_data.y, shape_data.r, 0, Math.PI * 2)
  
    return context
}

function getCircleDensity(svg, shape_data, segment_num, shape_type) {
    let center_point = [shape_data.x, shape_data.y]
    let strPath
    let shape = svg.append("path")
        .style("fill", "none")
        .style("stroke", "orange")
        .style("stroke-width", "1px")

    shape.attr('d', drawCircle(d3.path(), shape_data))

    strPath = drawCircle(d3.path(), shape_data).toString()

    /**
     * Start calculating
     */
    let path = shape.node()

    let widget = path.getTotalLength() / segment_num

    let segPolyList = [],
        prevValue = path.getPointAtLength((segment_num - 1) * widget)
    
    for (var i = 0; i < segment_num; i++) {
        let point = path.getPointAtLength(i * widget)
        
        segPolyList.push([[prevValue.x, prevValue.y], [point.x, point.y], center_point, center_point])

        prevValue = point
    }

    // console.log('segPolyList', segPolyList)
    

    return [segPolyList, strPath]
}

export default getCircleDensity
