import * as d3 from 'd3';
import {Point,Path} from 'paper'
/*
params: points array of boundary
*/

export function getDensity (pts_ary,segment_num = 3000){
  /* convert it to path and divide the path
    init an empty svg for calculating purpose
  */

  var path = new Path();

  for (var i = 0; i < pts_ary.length; i++) {
    var temp_point = new Point (pts_ary[i][0],pts_ary[i][1])
    path.add (temp_point)
  }

  let widget = path.length/segment_num, new_pts = []

  for (var i = 0; i < segment_num; i++) {
    var point  = path.getPointAt(i*widget);
     new_pts.push(point)
  }

  // quarterly split the list to advoid max exceeding
  let dictAllmin1Q= [];
  let dictAllmin2Q= [];
  let dictAllmin3Q= [];
  let dictAllmin4Q= [];


  for (var index = 0; index < segment_num/4; index++) {
    var result;
    result = minCircle(index, new_pts)
    dictAllmin1Q.push({index:index,radius:result[0],centerX:result[1],centerY:result[2]})
    }

  for (var index = segment_num/4; index < segment_num/2; index++) {
      var result;
      result = minCircle(index, new_pts)
      dictAllmin2Q.push({index:index,radius:result[0],centerX:result[1],centerY:result[2]})
    }

  for (var index = segment_num/2; index < 3*segment_num/4; index++) {
      var result;
      result = minCircle(index, new_pts)
      dictAllmin3Q.push({index:index,radius:result[0],centerX:result[1],centerY:result[2]})
    }

  for (var index = 3*segment_num/4; index < segment_num; index++) {
      var result;
      result = minCircle(index, new_pts)
      dictAllmin4Q.push({index:index,radius:result[0],centerX:result[1],centerY:result[2]})
    }

  let dictAllmin = dictAllmin1Q.concat(dictAllmin2Q,dictAllmin3Q,dictAllmin4Q)

  return dictAllmin;

  /*
    return dictAllmin as all maxinscribled circles
    TODO: check the circles and divid the slides to get three densities
  */

}



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
            var ciclePara =  threePointsCircle(pt1,pt2,pt3);
            //
            radiusList.push(ciclePara[0])
            radius_XList.push(ciclePara[1])
            radius_YList.push(ciclePara[2])
    }
    var minRadius =  findMinRadius(pt1,pt2,radiusList,radius_XList,radius_YList);
    var minIndex = radiusList.indexOf(minRadius)
    var p3_X = radius_XList[minIndex]
    var p3_Y = radius_YList[minIndex]

    return [minRadius,p3_X,p3_Y];

}

function getArea(curvept1,curvept2,centerpt1,centerpt2){
    var x1 = curvept1.x
    var x2 = curvept2.x
    var x3 = centerpt1.centerX
    var x4 = centerpt2.centerX
    var y1 = curvept1.y
    var y2 = curvept2.y
    var y3 = centerpt1.centerY
    var y4 = centerpt2.centerY


    var area1 = Math.abs(0.5*(Number(x1)*Number(y2)+Number(x2)*Number(y3)+Number(x3)*Number(y1)-Number(x1)*Number(y3)-Number(x2)*Number(y1)- Number(x3)*Number(y2)))
    var area2= Math.abs(0.5*(Number(x1)*Number(y3)+Number(x3)*Number(y4)+Number(x4)*Number(y1)-Number(x1)*Number(y4)-Number(x3)*Number(y1)- Number(x4)*Number(y3)))

    var area = Number(area1)+ Number(area2)

    return area;
}

function inside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point.x, y = point.y;

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i].x, yi = vs[i].y;
        var xj = vs[j].x, yj = vs[j].y;

        var intersect = ((yi >= y) != (yj >= y))
            && (x <= (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};


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

function weightedMean (list,areaList,stride) {

    var productList = []

    // this operation gets the result of all products
    for (var i = 0; i < list.length; i++) {
      productList.push(list[i]*areaList[i])
    }
    //this part gets initial upper
    var array_up_list     = productList.slice(0,stride+1)
    var array_down_list   = productList.slice((productList.length-stride),(productList.length+1))
    var array_list = array_down_list.concat(array_up_list);
    // this part gets initial lower
    var array_up_area     = areaList.slice(0,stride+1)
    var array_down_area   = areaList.slice((areaList.length-stride),(areaList.length+1))
    var array_area = array_down_area.concat(array_up_area);

    var init_list = getSum(array_list)
    var init_area = getSum(array_area)
    var init_weight = Number(init_list)/Number(init_area)

    var weighted_result = []
    weighted_result.push(init_weight)

    for (var i = 1; i < list.length-stride; i++) {
      array_list.shift();
      array_area.shift();
      var value1 = productList[i+stride];
      array_list.push(value1);
      var value2 = areaList[i+stride];
      array_area.push(value2);

      var new_list = getSum(array_list)
      var new_area = getSum(array_area)
      var newvalue = Number(new_list)/Number(new_area)
        weighted_result.push(newvalue)
    }
    for (var i = 0; i < stride; i++) {
      array_list.shift();
      array_area.shift();
      var value1 = productList[i];
      var value2 = areaList[i];
      array_list.push(value1);
      array_area.push(value2);

      var new_list = getSum(array_list)
      var new_area = getSum(array_area)

      var newvalue = Number(new_list)/Number(new_area)
        weighted_result.push(newvalue)
    }

    return weighted_result;
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

function findMinMax(arr) {
    let min = arr[0], max = arr[0];

    for (let i = 1, len=arr.length; i < len; i++) {
        let v = arr[i];
        min = (v < min) ? v : min;
        max = (v > max) ? v : max;
    }

    return [min, max];
}

function threePointsCircle (pt1,pt2,pt3){
    var centerX = (((pt1.x)*(pt1.x)+(pt1.y)*(pt1.y))*(pt2.y-pt3.y)+((pt2.x)*(pt2.x)+(pt2.y)*(pt2.y))*(pt3.y-pt1.y)+((pt3.x)*(pt3.x)+(pt3.y)*(pt3.y))*(pt1.y-pt2.y))/(2*(pt1.x*(pt2.y-pt3.y)-pt1.y*(pt2.x-pt3.x)+pt2.x*pt3.y-pt3.x*pt2.y))

    var centerY = (((pt1.x)*(pt1.x)+(pt1.y)*(pt1.y))*(pt3.x-pt2.x)+((pt2.x)*(pt2.x)+(pt2.y)*(pt2.y))*(pt1.x-pt3.x)+((pt3.x)*(pt3.x)+(pt3.y)*(pt3.y))*(pt2.x-pt1.x))/(2*(pt1.x*(pt2.y-pt3.y)-pt1.y*(pt2.x-pt3.x)+pt2.x*pt3.y-pt3.x*pt2.y))

    var circleRadius = Math.sqrt((centerX - pt1.x)*(centerX - pt1.x)+(centerY - pt1.y)*(centerY - pt1.y))

    return [circleRadius,centerX,centerY];
}

function slidingCalSum(widget,segment_num,sliding,ary) {

    var countList = [];
    var quotient = Math.floor(segment_num/sliding);
    var half_arS = (Math.floor(sliding/2));

  // initialize starting from index 0
      var init_array_up = ary.slice(0,half_arS+1)
      var init_array_down = ary.slice((ary.length-half_arS),(ary.length+1))


      var init_array = init_array_down.concat(init_array_up);

      var init_sum = init_array.reduce(function(s,x) {return (s + x)}, 0)

      countList.push(init_sum)

      for (var i = 1; i < ary.length-half_arS; i++) {

        init_array.shift();
        var value = ary[i+half_arS];
        init_array.push(value);
        var sum = init_array.reduce(function(s,x) {return (s + x)}, 0)
        sum = 100* sum/sliding

        countList.push(sum)

      }

      for (var i = 0; i < half_arS; i++) {
        // var sum = init_sum - init_array[0]
        init_array.shift();
        var value = ary[i];
        init_array.push(value)
        sum = init_array.reduce(function(s,x) {return (s + x)}, 0)
        sum = 100* sum/sliding
        countList.push(sum)
      }
      return countList;
}

function getSum(ary)
{
  var sum = ary.reduce(function(s,x) {return (s + x)}, 0);
  return sum;
}
