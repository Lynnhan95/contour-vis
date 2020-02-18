export function constructPtInSeg(segList,dataPts){
    var segPtsList =[]
    var counterList=[]

    for (var i = 0; i < segList.length; i++) {
      var subSeg = segList[i]
      var segPts = []
      var counter = 0 // init the counter only for monitoring
      for (var j = 0; j < dataPts.length; j++) {
        if (inside(dataPts[j],subSeg) == true) {
          segPts.push(dataPts[j])
          counter ++ ;
        }
      }
      if (counter != 0) {
        segPtsList.push({"index":i,"dots":segPts})
      }
      counterList.push(counter)
    }

    return segPtsList;
}

function inside(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi >= y) != (yj >= y))
            && (x <= (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};
