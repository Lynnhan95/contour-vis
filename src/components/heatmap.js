import React, {useEffect} from "react";
import h337 from "heatmapjs";
// import {sampleData} from './sampleData.js'
import rect_sample2 from './training_data/rect/rect_sample2.js'

function HeatMap(props) {

        console.log('heatmap')
        useEffect(() => {

        var heatmapInstance = h337.create({
            // only container is required, the rest will be defaults
            container: document.querySelector('.App'),
            gradient: {
                // enter n keys between 0 and 1 here
                // for gradient color customization
                // '.5': 'blue',
                // '.8': 'red',
                // '.95': 'white'
                '0.11':'#2c7bb6', 
                '0.22':'#00a6ca', 
                '0.33':'#00ccbc', 
                '0.44':'#90eb9d',
                '0.55':'#ffff8c',
                '0.66':'#f9d057',
                '0.77':'#f29e2e',
                '0.88':'#e76818', 
                '0.99':'#d7191c' 
              },
        });
    // now generate some random data
  //   var points = [];
  //   var max = 0;
  //   var width = 840;
  //   var height = 400;
  //   var len = 200;

  //   while (len--) {
  //    var val = Math.floor(Math.random()*100);
  //    max = Math.max(max, val);
  //    var point = {
  //     x: Math.floor(Math.random()*width),
  //     y: Math.floor(Math.random()*height),
  //     value: val
  //    };
  //    points.push(point);
  //  }

  //  console.log(max)
   // heatmap data format
  //  let processData = sampleData.map((d,i) => {
  //      return {
  //          x: parseInt(d.x),
  //          y: parseInt(d.y),
  //          value: d.value/ 15
  //      }
  //  })
   const getPointsArrFromMatrix = (matrix) => {
    let pos_arr = [] 
    pos_arr.push([matrix.x, matrix.y])
    pos_arr.push([matrix.x + matrix.width, matrix.y])
    pos_arr.push([matrix.x + matrix.width, matrix.y + matrix.height])
    pos_arr.push([matrix.x, matrix.y + matrix.height])
    return pos_arr
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
  // console.log(rect_sample2.matrix)
  let pos_arr = getPointsArrFromMatrix(rect_sample2.matrix)
  let lineStr = getLinePathStr(pos_arr)
  console.log(pos_arr, lineStr)

  //  let lineStr = 'M 694.2260085002108 130.99997816171617 L 718.0422714488183 186.02910289509802 C 720.6562515285434 192.0688848780302 717.9148820569548 205.57581229384525 712.5595325056408 213.04295772672816 L 674.4770468074087 266.14265858278446 C 669.1216972560948 273.60980401566735 669.0142905186233 293.9098276253382 674.2622333324657 306.7427058021261 L 711.5809377864566 397.9987283926181 C 716.828880600299 410.831606569406 712.2112237957692 434.43349478559213 702.345624177397 445.20250482499034 L 632.1902491134165 521.782131771822 C 622.3246494950442 532.5511418112203 599.8858015119223 545.8312069566625 587.3125531471726 548.3422620627065 L 497.90278699784153 566.1986539279084 C 485.32953863309183 568.7097090339523 468.9412698029585 568.1638049468031 465.1262493375749 565.1068457536098 L 437.9972149170693 543.3684692686797 C 434.1821944516857 540.3115100754865 432.76217755710564 526.0441286924724 435.1571811279092 514.8337065026516 L 452.1883176314012 435.1151487083704 C 454.5833212022048 423.9047265185496 444.2876783472136 416.19825907895665 431.5970319214188 419.70221382918453 L 341.35243511576715 444.61922538636054 C 328.66178868997235 448.1231801365884 314.54196666296275 441.06625218723525 313.1127910617478 430.50536948765426 L 302.9497645642196 355.4057591795226 C 301.5205889630047 344.8448764799416 294.3888653144844 334.09721422736527 288.686317267179 333.91043467437004 L 248.13486448634038 332.58222451973705 C 242.43231643903493 332.3954449667418 242.01392975986585 327.06624913472956 247.2980911280022 321.92383285571253 L 284.8743497458606 285.35553931603596 C 290.15851111399695 280.21312303701893 295.32236029078217 257.78501611582146 295.2020480994311 240.4993254736409 L 294.34649473871235 117.57885868480166 C 294.2261825473613 100.29316804262115 303.0564312396009 78.16998041349842 312.00699212319154 73.33248342655621 L 375.65542507316974 38.93250485274497 C 384.6059859567604 34.09500786580276 413.7406860911691 34.83205009785536 433.9248253419871 40.40658931685016 L 577.4564822366931 80.04775709636874 C 597.6406214875111 85.62229631536354 622.1868061856627 87.25016193803603 626.5488516329963 83.30348834171373 L 657.5678414807014 55.23825387897732 C 661.929886928035 51.29158028265501 668.8059992266044 54.87386311911722 671.3200660778401 62.40281955190173 L 694.2260085002108 130.99997816171617'
  // if you have a set of datapoints always use setData instead of addData
  // for data initialization
  let data = rect_sample2.dots.map((d,i) => {
    return {
      "x": d.x,
      "y": d.y,
      "value": 15
    }
  })
  // console.log(data)
  heatmapInstance.setData(data);
  let canvas = document.querySelector('.heatmap-canvas')
  // console.log(canvas)

  let ctx = canvas.getContext('2d')
  ctx.fillStyle = 'purple';
  data.forEach((d,i) => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 0.5, 0, 2 * Math.PI);
    ctx.fill();
  })

//   let splitStr = lineStr.match(/<path\b([\s\S]*?)\/>/g)
//   console.log( splitStr )

  var p = new Path2D(lineStr)
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.3;
  ctx.stroke(p);
//   ctx.fill(p);


 })



  return (
    <div className="myCanvas">
    </div>
  );
}

export default HeatMap;