
/*
  params: subseglist is the list containing all subsegments divided from each segment
          dataPts: all data points inside the outline/boundary
*/

export function insideCounter (subSegGroup_ary, dataPts){
        // for each subseg

        var densityGroup = []

        for (var i = 0; i < subSegGroup_ary.length; i++) {


          var subSegGroup  = subSegGroup_ary[i] // it has four points
          var subDensityGroup = []
          for (var j = 0; j < subSegGroup.length; j++) {
            var subSeg = subSegGroup[j]
            var counter = 0 // init the counter
            dataPts.forEach((pt, i) => {
              if (inside(pt,subSeg) == true) {
                counter ++ ;
              }
            });
            var area = getArea (subSeg)
            var density = counter/area
            subDensityGroup.push(density)
          }
          densityGroup.push (subDensityGroup)
        }

        return densityGroup;
    }


    function getArea(poly){

        var x1 = poly[0][0]
        var x2 = poly[1][0]
        var x3 = poly[2][0]
        var x4 = poly[3][0]
        var y1 = poly[0][1]
        var y2 = poly[1][1]
        var y3 = poly[2][1]
        var y4 = poly[3][1]


        var area1 = Math.abs(0.5*(Number(x1)*Number(y2)+Number(x2)*Number(y3)+Number(x3)*Number(y1)-Number(x1)*Number(y3)-Number(x2)*Number(y1)- Number(x3)*Number(y2)))
        var area2= Math.abs(0.5*(Number(x1)*Number(y3)+Number(x3)*Number(y4)+Number(x4)*Number(y1)-Number(x1)*Number(y4)-Number(x3)*Number(y1)- Number(x4)*Number(y3)))

        var area = Number(area1)+ Number(area2)

        return area;
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
