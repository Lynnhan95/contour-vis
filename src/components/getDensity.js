import * as d3 from 'd3';
// import {Point,Path} from 'paper'
// import {insideCounter} from './insideCounter'
import {roundPathCorners} from './rounding'

/*
params: points array of boundary
*/
// var bigest_circle = {
//   radius: 0
// }


function drawRect(context, shape_data) {
  context.rect(shape_data.x, shape_data.y, shape_data.width, shape_data.height)

  return context
}

function drawPolygon(context, shape_polygon) {
  // context.moveTo(shape_polygon[0][0], shape_polygon[0][1])
  // for(let i= 1; i< shape_polygon.length; i++) {
  //   context.lineTo(shape_polygon[i][0], shape_polygon[i][1])
  // }

  // return context
  let curveStr = context(shape_polygon)
  console.log(curveStr);
  
  return curveStr
}

function drawCircle(context, shape_data) {
  // context.arc(shape_data.x + shape_data.r, shape_data.y + shape_data.r, shape_data.r, 0, Math.PI * 2)
  context.arc(shape_data.x, shape_data.y, shape_data.r, 0, Math.PI * 2)

  return context
}

export function getDensity(svg, shape_data, segment_num, shape_type, shape_polygon) {
  /** 
   * convert it to path and divide the path 
   * init an empty svg for calculating purpose
  */

  /**
   * TODO: Now, we need draw Rect or Circle shape
   */
  // var strPath = getLinePathStr(shape_data)
  // strPath = roundPathCorners(strPath, 0.1, true)
  // console.log(strPath);
  var strPath
  var pointsAtcurve = []

  var shape = svg.append("path")
    .style("fill", "none")
    .style("stroke", "orange")
    .style("stroke-width", "1px")
    var path = shape.node();
  //   .attr("d", draw(d3.path(), strPath));

  // function draw(context, strPath) {
  //   var split = strPath.split(/(?=[LMC])/)
  //   for (var i = 0; i < split.length; i++) {
  //     let current = split[i]
  //     current = current.split(" ")
  //     if (current[0] == "M") {
  //       context.moveTo(Number(current[1]), Number(current[2]));
  //     }
  //     if (current[0] == "L") {
  //       context.lineTo(Number(current[1]), Number(current[2]))
  //     }
  //     if (current[0] == "C") {
  //       context.bezierCurveTo(Number(current[1]), Number(current[2]), Number(current[3]), Number(current[4]), Number(current[5]), Number(current[6]))
  //     }
  //   }
  //   return context; // not mandatory, but will make it easier to chain operations
  // }
  switch (shape_type) {
    case 'rect':
      shape.attr('d', drawRect(d3.path(), shape_data))

      strPath = drawRect(d3.path(), shape_data).toString()
      break;

    case 'circle':
      shape.attr('d', drawCircle(d3.path(), shape_data))

      strPath = drawCircle(d3.path(), shape_data).toString()
      break;
    
    case 'nut':
      shape.attr('d', drawPolygon(d3.line().curve(d3.curveCatmullRomClosed), shape_polygon))

      strPath = drawPolygon(d3.line().curve(d3.curveCatmullRomClosed), shape_polygon)

      // pointsAtcurve
      
      break;
  
    default:
      break;
  }

  /**
   * get points from curve
   */

  
  pointsAtcurve = 
    [
      [550, 250],
      [650, 100],
      [750, 175],
      [950, 250],
      [880, 400],
      [750, 300],
      [650, 400],
      [550, 250]
    ]


  /**
   * Start calculating
   */

  

  let widget = path.getTotalLength() / segment_num,
    new_pts = [], temp_index

  let prevValue = path.getPointAtLength((segment_num - 1) * widget)


  for (var i = 0; i < segment_num; i++) {
    var point = path.getPointAtLength(i * widget);
    var newPoint = {
      x: (point.x + prevValue.x) / 2,
      y: (point.y + prevValue.y) / 2
    }
    prevValue = point

    new_pts.push(newPoint)
  }

  
  
  // quarterly split the list to advoid max exceeding
  let dictAllmin1Q = [];
  let dictAllmin2Q = [];
  let dictAllmin3Q = [];
  let dictAllmin4Q = [];

  for (let index = 0; index < segment_num / 4; index++) {
    let result;
    result = minCircle(index, new_pts)
    let circle = {
      index: index,
      radius: result[0],
      centerX: result[1],
      centerY: result[2]
    }
    
    if(result[0] && result[1] && result[2]){
      dictAllmin1Q.push(circle)
    }
    
  }

  for (let index = segment_num / 4; index < segment_num / 2; index++) {
    let result;
    result = minCircle(index, new_pts)
    let circle = {
      index: index,
      radius: result[0],
      centerX: result[1],
      centerY: result[2]
    }
    
    // if(result[0] && result[1] && result[2]){
      dictAllmin2Q.push(circle)
    // }
    
  }

  for (let index = segment_num / 2; index < 3 * segment_num / 4; index++) {
    let result;
    result = minCircle(index, new_pts)
    let circle = {
      index: index,
      radius: result[0],
      centerX: result[1],
      centerY: result[2]
    }
    
    if(result[0] && result[1] && result[2]){
      dictAllmin3Q.push(circle)
    }
    
  }

  for (let index = 3 * segment_num / 4; index < segment_num; index++) {
    let result;
    
    result = minCircle(index, new_pts)

    let circle = {
      index: index,
      radius: result[0],
      centerX: result[1],
      centerY: result[2]
    }
    
    // TODO: some questional data in dictAllmin4Q
    if(result[0] && result[1] && result[2]){
      dictAllmin4Q.push(circle)
    }
  }

  let dictAllmin = dictAllmin1Q.concat(dictAllmin2Q, dictAllmin3Q, dictAllmin4Q)
  temp_index = dictAllmin.length
  // console.log('dictAllmin', dictAllmin);


  let segPolyList = []
  // for (var i = 0; i < new_pts.length; i++) {
  for (var i = 0; i < temp_index; i++) {
    var center1 = [dictAllmin[i].centerX, dictAllmin[i].centerY]
    var pt1 = [new_pts[i].x, new_pts[i].y]

    var center2, pt2;
    if (i !== temp_index - 1) {
      if(!dictAllmin[i + 1]){
        console.log(i, temp_index, dictAllmin[i + 1]);
        
      }
      center2 = [dictAllmin[i + 1].centerX, dictAllmin[i + 1].centerY]
      pt2 = [new_pts[i + 1].x, new_pts[i + 1].y]
    }
    if (i === temp_index - 1) {
      center2 = [dictAllmin[0].centerX, dictAllmin[0].centerY]
      pt2 = [new_pts[0].x, new_pts[0].y]
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////
    /*
      refactor the polygon. extend the edges for intersecting with the outline
    */

    /////////////////////////////////////////////////////////////////////////////////////////////////


    var d1 = Math.pow(((center1[0] - pt1[0]) * (center1[0] - pt1[0]) + (center1[1] - pt1[1]) * (center1[1] - pt1[1])), 0.5)
    var d2 = Math.pow(((center2[0] - pt2[0]) * (center2[0] - pt2[0]) + (center2[1] - pt2[1]) * (center2[1] - pt2[1])), 0.5)


    var extendMetric = 12
    var scale1 = (d1 + extendMetric) / d1
    var scale2 = (d2 + extendMetric) / d2


    var new_pt1 = [(scale1 * (pt1[0] - center1[0]) + center1[0]), (scale1 * (pt1[1] - center1[1]) + center1[1])]
    var new_pt2 = [(scale2 * (pt2[0] - center2[0]) + center2[0]), (scale2 * (pt2[1] - center2[1]) + center2[1])]

    var polygon = [new_pt1, new_pt2, center2, center1]
    segPolyList.push(polygon)
  }

  /*
    return dictAllmin as all maxinscribled circles

  */


  return [dictAllmin, segPolyList, strPath, pointsAtcurve];

}

// calculate the Bigest circle
// function getBigestCircle(next_circle) {
//   if(bigest_circle.radius < next_circle.radius){
//     bigest_circle = next_circle
//   }
// }

function minCircle (pt_index,newpts_list){
    var pt1;
    var pt2;
    var radiusList = [];
    var radius_XList = [];
    var radius_YList = [];

    if (pt_index===newpts_list.length-1) {
      pt1=newpts_list[newpts_list.length-1]
      pt2 = newpts_list[0]
    }
    else {
      pt1=newpts_list[pt_index]
      pt2=newpts_list[pt_index+1]
    }

    for (var i = 0; i < newpts_list.length; i++) {
      var secondbnd = pt_index+1
        if (pt_index===newpts_list.length-1) {
          secondbnd = 0
        }
        if (i === pt_index||i===secondbnd) {
          continue;
        }
        var pt3 = newpts_list[i]
        
        // this circlePara will give three parameters regarding radius, and centerX, centerY
        var ciclePara = threePointsCircle(pt1,pt2,pt3);
        
        // if(pt_index === 485){
        //   console.log('pt1 pt2 pt3', pt1, pt2, pt3, ciclePara);
        // }
        //
        radiusList.push(ciclePara[0])
        radius_XList.push(ciclePara[1])
        radius_YList.push(ciclePara[2])
    }
    // if(pt_index === 485){
    //   console.log('minCircle', radiusList);
    // }
    var minRadius =  findMinRadius(pt1,pt2,radiusList,radius_XList,radius_YList);
    var minIndex = radiusList.indexOf(minRadius)
    var p3_X = radius_XList[minIndex]
    var p3_Y = radius_YList[minIndex]

    // if(pt_index === 485){
    //   console.log('minCircle', minRadius, radiusList);
    // }

    return [minRadius,p3_X,p3_Y];

}

function squareMatrixMultiply(A, B) {
    var n = A.length;
    var C = [];
    for (var i = 0; i < n; i++) {
            C[i] = [];
            for (var j = 0; j < n; j++) {
                    C[i][j] = 0;
                    for (var k = 0; k < n; k++) {
                            C[i][j] += A[i][k] * B[k][j];
                    }
            }
    }
    return C;
}




function check_valid_min(circleX, circleY, pt1, pt2) {

    // use the third point to check whether the circle is inside the outline or not
    var inside_point = getThirdPoint(pt2,pt1,5);
    var result = ((pt1.y-pt2.y)*(circleX-pt1.x)+(pt2.x-pt1.x)*(circleY-pt1.y))*((pt1.y-pt2.y)*(inside_point.x-pt1.x)+(pt2.x-pt1.x)*(inside_point.y)*(inside_point.y-pt1.y))
    if (result > 0 ) {
        return false;
    }
    if (result< 0 ) {
        return true;
    }
}



function getThirdPoint(pt1,pt2,dist) {

    var rotate_matrix = [[0,-1], [1,0]]
    var vector_length = Math.sqrt((pt1.x-pt2.x)*(pt1.x-pt2.x)+(pt1.y-pt2.y)*(pt1.y-pt2.y))
    var b_norm = [[(-pt1.x+pt2.x)/vector_length],[(-pt1.y+pt2.y)/vector_length]]
    var Multi_result = squareMatrixMultiply(rotate_matrix,b_norm);
    var perp_vector = [dist*Multi_result[0][0],dist*Multi_result[1][0]]
    var mid_point = [((pt1.x+pt2.x)/2),((pt1.y+pt2.y)/2)]
    var third_point = {x:(perp_vector[0]+mid_point[0]),y:(perp_vector[1]+mid_point[1])}
    return third_point;
}


//find the minium radius however check the center whether inside the curve
function findMinRadius(input_pt1,input_pt2,radiusList,radius_XList,radius_YList) {
    var pt1 = input_pt1
    var pt2 = input_pt2
    var runCount = 0;
    var minmaxRadius = findMinMax(radiusList)
    var minRadius = minmaxRadius[0]
    var minIndex = radiusList.indexOf(minRadius)
    var list_backup = radiusList;
    var p3_X = radius_XList[minIndex]
    var p3_Y = radius_YList[minIndex]

    var bool_valid = check_valid_min(p3_X,p3_Y,pt1,pt2)

    if (bool_valid === false){
        radiusList[minIndex] = 50000;
        runCount++;
        try {
          return findMinRadius(pt1,pt2,radiusList,radius_XList,radius_YList)
        } catch (e ) {
          if ( e instanceof RangeError) {
              console.log("workingFunc():: " + e +  ": " + runCount );
          }
        }
    }
    else {
        return minRadius;
    }
}

// function findMinMax(arr) {
//     let min = arr[0], max = arr[0];

//     for (let i = 1, len=arr.length; i < len; i++) {
//         let v = arr[i];
//         min = (v < min) ? v : min;
//         max = (v > max) ? v : max;
//     }

//     return [min, max];
// }
function findMinMax(arr) {
  let min, max, len=arr.length, i, j

  for (j = 0; j < len; j++) {
    if(!!arr[j]){
      min = arr[j]
      max = arr[j]

      break
    }
  }

  for (i = j + 1; i < len; i++) {
    let v = arr[i];
    if(!!v){
      min = (v < min) ? v : min
      max = (v > max) ? v : max
    }
  }

  return [min, max]
}

function threePointsCircle (pt1,pt2,pt3){
    var centerX = (((pt1.x)*(pt1.x)+(pt1.y)*(pt1.y))*(pt2.y-pt3.y)+((pt2.x)*(pt2.x)+(pt2.y)*(pt2.y))*(pt3.y-pt1.y)+((pt3.x)*(pt3.x)+(pt3.y)*(pt3.y))*(pt1.y-pt2.y))/(2*(pt1.x*(pt2.y-pt3.y)-pt1.y*(pt2.x-pt3.x)+pt2.x*pt3.y-pt3.x*pt2.y))

    var centerY = (((pt1.x)*(pt1.x)+(pt1.y)*(pt1.y))*(pt3.x-pt2.x)+((pt2.x)*(pt2.x)+(pt2.y)*(pt2.y))*(pt1.x-pt3.x)+((pt3.x)*(pt3.x)+(pt3.y)*(pt3.y))*(pt2.x-pt1.x))/(2*(pt1.x*(pt2.y-pt3.y)-pt1.y*(pt2.x-pt3.x)+pt2.x*pt3.y-pt3.x*pt2.y))

    var circleRadius = Math.sqrt((centerX - pt1.x)*(centerX - pt1.x)+(centerY - pt1.y)*(centerY - pt1.y))

    return [circleRadius,centerX,centerY];
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




function getSum(ary){
  var sum = ary.reduce(function(s,x) {return (s + x)}, 0);
  return sum;
}
