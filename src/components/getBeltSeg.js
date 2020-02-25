//import polygonClipping from 'polygon-clipping'
import {Point,Path} from 'paper'
import {roundPathCorners} from './rounding'

export function getBeltSeg(segPoly, strPath, clip_boundary, type) {
  var outPolyPath = new Path(strPath)

  var segPath1 = new Path();
  var segPath2 = new Path();
  
  let offsetPath = clip_boundary.toString()
  // console.log(offsetPath)
  // offsetPath = roundPathCorners(offsetPath,0.1,true)
  var clipPath = new Path(offsetPath)
  // console.log('segPoly', segPoly)
  
  var ptC1 = new Point (segPoly[3][0],segPoly[3][1])
  var ptC2 = new Point (segPoly[2][0],segPoly[2][1])
  var ptP1 = new Point (segPoly[0][0],segPoly[0][1])
  var ptP2 = new Point (segPoly[1][0],segPoly[1][1])


  segPath1.add(ptC1,ptP1) // line passes thru center 1
  segPath2.add(ptC2,ptP2)

  let interSect1 = clipPath.getIntersections(segPath1)
  let interSect2 = clipPath.getIntersections(segPath2)

  let interSect3 = outPolyPath.getIntersections(segPath1)
  let interSect4 = outPolyPath.getIntersections(segPath2)

  if(interSect1.length === 0 || interSect2.length === 0) {
    interSect1 = [{point: {x:segPoly[3][0], y:segPoly[3][1]}}]
    interSect2 = [{point: {x:segPoly[2][0], y:segPoly[2][1]}}]
    //console.log(interSect1, interSect2)
  }

  if(interSect3.length === 0 || interSect4.length === 0){
    interSect3 = [{point: {x:segPoly[0][0], y:segPoly[0][1]}}]
    interSect4 = [{point: {x:segPoly[1][0], y:segPoly[1][1]}}]
  }

  // console.log(interSect1, interSect2, interSect3, interSect4)
  if (type === "rect") {
    return ([

      [interSect4[0].point.x, interSect4[0].point.y],
      [interSect3[0].point.x, interSect3[0].point.y],
      [interSect1[0].point.x, interSect1[0].point.y],
      [interSect2[0].point.x, interSect2[0].point.y]
    ])
  } else {
    return ([
      
      [interSect1[0].point.x, interSect1[0].point.y],
      [interSect2[0].point.x, interSect2[0].point.y],
      [interSect4[0].point.x, interSect4[0].point.y],
      [interSect3[0].point.x, interSect3[0].point.y],
    ])
  }

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
