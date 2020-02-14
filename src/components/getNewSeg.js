import polygonClipping from 'polygon-clipping'
import {Point,Path} from 'paper'

export function getNewSeg(segPoly, strPath ,index) {

    var polyPath = new Path(strPath);
    var segPath1 = new Path();
    var segPath2 = new Path();

    //
    // for (var i = 0; i < clip_boundary.length; i++) {
    //   var temp_point = new Point (clip_boundary[i][0],clip_boundary[i][1])
    //   polyPath.add (temp_point)
    // }
    //
    //

    var ptC1 = new Point (segPoly[3][0],segPoly[3][1])
    var ptC2 = new Point (segPoly[2][0],segPoly[2][1])
    var ptP1 = new Point (segPoly[0][0],segPoly[0][1])
    var ptP2 = new Point (segPoly[1][0],segPoly[1][1])


    segPath1.add(ptC1,ptP1) // line passes thru center 1
    segPath2.add(ptC2,ptP2)

    let interSect1 = polyPath.getIntersections(segPath1) // polygon intersects to line thru center 1
    let interSect2 = polyPath.getIntersections(segPath2)

    let newPt1 = interSect1[0]
    let newPt2 = interSect2[0]


    let newAry = []
    newAry.push(segPoly[3])
    newAry.push(segPoly[2])
    newAry.push([newPt1.point.x,newPt1.point.y])
    newAry.push([newPt2.point.x,newPt2.point.y])


    return ([segPoly[3],segPoly[2],[interSect2[0].point.x,interSect2[0].point.y], [interSect1[0].point.x,interSect1[0].point.y]]);
    // return polygonClipping.intersection([segPoly], [clip_boundary])[0][0]
}
