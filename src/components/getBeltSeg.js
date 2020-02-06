//import polygonClipping from 'polygon-clipping'
import {Point,Path} from 'paper'

export function getBeltSeg(segPoly, clip_outBoundary, clip_boundary ,index) {
  var outPolyPath = new Path()
  var polyPath = new Path()
  var segPath1 = new Path();
  var segPath2 = new Path();

  for (var i = 0; i < clip_outBoundary.length; i++) {
    var temp_point = new Point (clip_outBoundary[i][0],clip_outBoundary[i][1])
    outPolyPath.add (temp_point)
  }

  for (var i = 0; i < clip_boundary.length; i++) {
    var temp_point = new Point (clip_boundary[i][0],clip_boundary[i][1])
    polyPath.add (temp_point)
  }

  var ptC1 = new Point (segPoly[3][0],segPoly[3][1])
  var ptC2 = new Point (segPoly[2][0],segPoly[2][1])
  var ptP1 = new Point (segPoly[0][0],segPoly[0][1])
  var ptP2 = new Point (segPoly[1][0],segPoly[1][1])


  segPath1.add(ptC1,ptP1) // line passes thru center 1
  segPath2.add(ptC2,ptP2)

  let interSect1 = polyPath.getIntersections(segPath1)
  let interSect2 = polyPath.getIntersections(segPath2)

  let interSect3 = outPolyPath.getIntersections(segPath1)
  let interSect4 = outPolyPath.getIntersections(segPath2)

  if(interSect1.length ==0 || interSect2.length ==0) {
    interSect1 = [{point: {x:segPoly[3][0], y:segPoly[3][1]}}]
    interSect2 = [{point: {x:segPoly[2][0], y:segPoly[2][1]}}]
    //console.log(interSect1, interSect2)
  }

  //console.log(interSect1, interSect2, interSect3, interSect4)
  return ([
    [interSect4[0].point.x, interSect4[0].point.y],
    [interSect3[0].point.x, interSect3[0].point.y],
    [interSect1[0].point.x, interSect1[0].point.y],
    [interSect2[0].point.x, interSect2[0].point.y],
      ])
}
