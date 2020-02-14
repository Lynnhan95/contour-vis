var w = 140, h = 400;

			var key = d3.select("body").append("svg").attr("width", w).attr("height", h);

			var legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "100%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");

			legend.append("stop").attr("offset", "0%").attr("stop-color", "#B30000").attr("stop-opacity", 1);

			legend.append("stop").attr("offset", "100%").attr("stop-color", "#FEE8c8").attr("stop-opacity", 1);

			key.append("rect").attr("width", w - 100).attr("height", h - 100).style("fill", "url(#gradient)").attr("transform", "translate(0,10)");

			var y = d3.scale.linear().range([300, 0]).domain([1, 100]);

			var yAxis = d3.svg.axis().scale(y).orient("right");

			key.append("g").attr("class", "y axis").attr("transform", "translate(41,10)").call(yAxis).append("text").attr("transform", "rotate(-90)").attr("y", 30).attr("dy", ".71em").style("text-anchor", "end").text("axis title");