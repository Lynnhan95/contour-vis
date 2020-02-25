import React, {useEffect, useRef} from "react";
import h337 from "heatmap.js";
// import {sampleData} from './sampleData.js'
// import sampleData from './training_data/rect/sampleData.js'
import './style.css'

function HeatMap(props) {

  let my_canvas = useRef()

        const sampleData = props.data
        // sample2 
        // const transform_matrix = {x: -120, y: -420}
        // sample9 && sample10
        const transform_matrix = {x: -120, y: -70}
        useEffect(() => {
          
        var heatmapInstance = h337.create({
            // container: document.querySelector('.App'),
            container: my_canvas.current,
            gradient: {

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

   const getPointsArrFromMatrix = (matrix) => {
    let pos_arr = [] 
    pos_arr.push([matrix.x + transform_matrix.x, matrix.y + transform_matrix.y])
    pos_arr.push([matrix.x + matrix.width + transform_matrix.x, matrix.y + transform_matrix.y])
    pos_arr.push([matrix.x + matrix.width + transform_matrix.x, matrix.y + matrix.height + transform_matrix.y])
    pos_arr.push([matrix.x + transform_matrix.x, matrix.y + matrix.height + transform_matrix.y])
    pos_arr.push([matrix.x + transform_matrix.x, matrix.y + transform_matrix.y])
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

  let pos_arr = getPointsArrFromMatrix(sampleData.matrix)
  let lineStr = getLinePathStr(pos_arr)
  console.log(pos_arr, lineStr)

  // if you have a set of datapoints always use setData instead of addData
  // for data initialization
  let sample = sampleData.dots.map((d,i) => {
    return {
      "x": parseInt(d.x + transform_matrix.x),
      "y": parseInt(d.y + transform_matrix.y),
      "value": 1
    }
  })
  const data = {
    max: 20,
    data: sample
  }
  console.log(data)
  heatmapInstance.setData(data);
  let canvas = document.querySelector('.heatmap-canvas')

  let ctx = canvas.getContext('2d')
  // console.log(ctx)

  ctx.fillStyle = 'purple';
  data.data.forEach((d,i) => {
    // console.log(d.x, d.y)
    ctx.beginPath();
    ctx.arc(d.x, d.y, 0.5, 0, 2 * Math.PI);
    ctx.fill();
    // ctx.beginPath();
    // ctx.arc(800, 550, 50, 0, 2 * Math.PI);
    // ctx.stroke();
  })

//   let splitStr = lineStr.match(/<path\b([\s\S]*?)\/>/g)
//   console.log( splitStr )

  var p = new Path2D(lineStr)
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 0.3;
  ctx.stroke(p);
//   ctx.fill(p);


 })

  let c_height
  switch (props.type) {
    case 'rect':
      c_height = sampleData.matrix.height + 100
      break;

    case 'circle':
      c_height = sampleData.matrix.r * 3
      break;
  
    default:
      break;
  }

  return (
    <div className="myCanvas" ref={my_canvas} style={{height: `${c_height}px`}}>
    </div>
  );
}

export default HeatMap;