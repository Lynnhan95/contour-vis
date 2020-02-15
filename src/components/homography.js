import * as PerspT from 'perspective-transform'

export function hoMo (segment_ary,belt_ary,pts_inside_ary){
  var outputAllpts = []
  console.log(segment_ary.length);
  console.log(belt_ary.length);
  console.log(pts_inside_ary.length);

  for (var i = 0; i < pts_inside_ary.length; i++) {

    var index = pts_inside_ary[i].index
    var data = pts_inside_ary[i].dots
    var srcCorners =  [segment_ary[index][0][0],segment_ary[index][0][1], segment_ary[index][1][0], segment_ary[index][1][1], segment_ary[index][2][0], segment_ary[index][2][1],
    segment_ary[index][3][0],segment_ary[index][3][1]];
    var dstCorners =  [belt_ary[index][0][0],belt_ary[index][0][1], belt_ary[index][1][0], belt_ary[index][1][1], belt_ary[index][2][0]
    , belt_ary[index][2][1],belt_ary[index][3][0],belt_ary[index][3][1]];
    var perspT = PerspT(srcCorners, dstCorners);
    var mat = perspT.coeffs;
    for (var j = 0; j < data.length; j++) {
        var srcPt = [data[j][0], data[j][1]];
        var dstPt = perspT.transform(srcPt[0], srcPt[1]);
        outputAllpts.push(dstPt)
    }
  }

  // for (var i = 0; i < segment_ary.length; i++) {
  //   var srcCorners =  [segment_ary[0][0],segment_ary[0][1], segment_ary[1][0], segment_ary[1][1], segment_ary[2][0], segment_ary[2][1],segment_ary[3][0],segment_ary[3][1]];
  //   var dstCorners =  [belt_ary[0][0],belt_ary[0][1], belt_ary[1][0], belt_ary[1][1], belt_ary[2][0], belt_ary[2][1],belt_ary[3][0],belt_ary[3][1]];
  //   var perspT = PerspT(srcCorners, dstCorners);
  //   var mat = perspT.coeffs;
  //   if (pts_inside_ary[i].length != 0 ) {
  //     for (var j = 0; j < pts_inside_ary[i].length; j++) {
  //         var srcPt = [pts_inside_ary[i][j][0], pts_inside_ary[i][j][1]];
  //         var dstPt = perspT.transform(srcPt[0], srcPt[1]);
  //         outputAllpts.push(dstPt)
  //     }
  //   }
  // }

  return outputAllpts
}
