function addOverlay(viewer, x1, y1, x2, y2) 
{
    var div = document.createElement("div");
    var rect = new Seadragon.Rect(x1, y1, x2, y2);

    div.className = "overlay";
    viewer.drawer.addOverlay(div, rect);
};

function addOverlays(viewer) 
{
    var factor = viewer.source.height / viewer.source.width;
    $.each("".split("+"), function(index, word) {
		if (word!="") {
		    $.getJSON('/beta/lccn/sn83030213/1865-04-10/ed-1/seq-1/coordinates/;words='+word, function(all_coordinates) {
			    var boxes = [];
			    for (word in all_coordinates) {
					var coordinates = all_coordinates[word];
					for (k in coordinates) {
					    var v = coordinates[k];
					    addOverlay(
                            viewer, 
						    v["hpos"],
						    v["vpos"]*factor,
						    v["width"],
						    v["height"]*factor
                        );
					}
			    }
			});
		}
    });
};
