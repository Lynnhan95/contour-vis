This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Intro
From data to csv
Boundary data: 
geojson (array) —>
smooth outline with array (library: [https://github.com/RobinCK/smooth-polyline](https://github.com/RobinCK/smooth-polyline)) —> 
offset boundary with the array (library: [https://github.com/w8r/polygon-offset](https://github.com/w8r/polygon-offset)) —>
medial axis computation ⭐([https://github.com/FlorisSteenkamp/MAT](https://github.com/FlorisSteenkamp/MAT)) —>
segmentation 


### Sites data:
Map dots to the map (作为参照) —> 
Given a segmentation, map dot density —> color range 
computes all segments —> color ranges 


### Code: 
1. react or not?  Using lots of npm package;
2. ⭐ problem of using an library:  1. Data input;   2. 等距两点 —> 画出最大内切圆 —> 内切圆点的集合 == medial axis      


### Step:
1. Start from Zhejiang province, mapping Zhejiang boundary + dots (example: [http://ssz.fr/places/?eu#ac$//] (http://ssz.fr/places/?eu#ac$//)) . ✅
2. Smooth outline + offset outline ✅
3. Medial axis + segmentation ❌ <br/> (Problem: Can not segment the region correctly because there's too many branch; Can not find all intersection points, which may due to: findMinDistance issue, or path-intersection issue).
4. Mapping density —> color ✅ （Need to refine and aggregate them into a pure function)

### Schedule for December:
1. Finish the boundary segmentation function, sub-segment counting function and color projection function, by December 28th.
2. Look into Medial Axis source code, and understand how [a point on medial axis] and [a point on the edge] matches.
3. Junhan will help on segmentation computation, therefore, we can make sure to have an output whatever which region segmentation algorithm to use.
4. Compare medial axis computation result with Junhan's maximum intersect circle.
5. Guojun will look at "region with multiple center" implementation.

## Algorithm about
1. Interpolate point on path evenly:

![even_points](./src/assets/even_points.jpg)

