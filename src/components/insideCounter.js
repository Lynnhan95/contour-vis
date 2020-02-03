
export function insideCounter (centerDict,curvePtList,dotsList){

        var inside_point_density_list = [];
        var inside_point_numb_list = [];

        var area_list=[]

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
