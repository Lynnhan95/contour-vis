
/*
  params: subseglist is the list containing all subsegments divided from each segment
          dataPts: all data points inside the outline/boundary
*/


export function insideCounter (subSegGroup_ary, dataPts, segNumb,slidingNumb,scaleFactor = 200){
        // for each subseg

        var densityGroup = []
        var areaGroup = []
        var newDensityGroup = []
        var density_min = 0
        var density_max = 0
        var densityBystripe = []
        var areaBystripe = []




        for (var i = 0; i < subSegGroup_ary.length; i++) {
          // there are three subseg for each item

          var subSegGroup  = subSegGroup_ary[i] // it has four points
          var subDensityGroup = []
          var subAreaGroup = []
          for (var j = 0; j < subSegGroup.length; j++) {

            var subSeg = subSegGroup[j]
            var counter = 0 // init the counter
            if (i == 0) {
              densityBystripe.push([])
              areaBystripe.push([])
            }

            dataPts.forEach((pt, i) => {
              if (inside(pt,subSeg) == true) {
                counter ++ ;
              }
            });
            var area = getArea (subSeg)
            var density = counter/area

            if (density>density_max) {
              density_min = density
            }
            if (density<density_min) {
              density_max = density
            }
            subDensityGroup.push(density)
            subAreaGroup.push(area)
            areaBystripe[j].push(area)
            densityBystripe[j].push(density)
          }

          // set length of densityGroup
          densityGroup.push ([])
          // densityGroupNorm.push (subDensityGroup)
          areaGroup.push(subAreaGroup)
        }
        console.log(areaGroup);
        console.log(density_min+"<<<<"+density_max);
        for (var i = 0; i < densityBystripe.length; i++) {
          let newDensitySub

          newDensitySub = weightedMean(densityBystripe[i],areaBystripe[i],slidingNumb)
          newDensitySub = slidingCalSum(segNumb,slidingNumb,densityBystripe[i])
          newDensitySub = newDensitySub.map(function(item){ item = item*scaleFactor;  if (item ==0) {item=0.1} ;return item;})


          // scale up
          newDensityGroup.push(newDensitySub)
        }
        // refactor back to old structure
        console.log(newDensityGroup);

        for (var i = 0; i < densityGroup.length; i++) {
          for (var j = 0; j < newDensityGroup.length; j++) {
            densityGroup[i].push(newDensityGroup[j][i])
          }
        }

        let perpenDensity=[];
        for (var i = 0; i < densityGroup.length; i++) {
          let result = slidingCalSum(segNumb,8,densityGroup[i])
          // var j=1
          // while (j < len+1) {
          //   if (j == len) {
          //       init.push(densityGroup[i][0])
          //   }
          //   else {
          //       init.push(densityGroup[i][j])
          //   }
          //   result.push(getSum(init)/3)
          //   init.shift()
          //   j++
          //
          // }
          perpenDensity.push(result)
        }

        densityGroup =perpenDensity


        console.log(densityGroup);
        // we do sliding and average process over here. For index i, it is the stripe of the subsegment



        return [densityGroup,areaGroup];
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

    function slidingCalSum(segment_num,sliding,ary) {

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

  function getSum(ary)
  {
    var sum = ary.reduce(function(s,x) {return (s + x)}, 0);
    return sum;
  }
