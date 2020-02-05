

export function densityAdj (counterL,sliding,segment_num,gadget,factor){

    var countDensity = counterL[0]
    var countInteger = counterL[1]
    var countArea = counterL[2]

    //sliding the density
    //  densityMulti =   slidingCalSum(gadget,segment_num,sliding,countDensity);
    //
    // //sliding calculate the counts integers
    //  integerMulti =   slidingCalSum(gadget,segment_num,sliding,countInteger);
    //
    // //sliding calculate the area
    //  areaMulti =   slidingCalSum(gadget,segment_num,sliding,countArea);
    //
    //  widthResult =  weightedMean( densityMulti,countArea,sliding)
    //
    //  widthResult =  widthResult.map(function(i){ i = i*factor;  if (i ==0) {i=0.1} ;return i;})

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
