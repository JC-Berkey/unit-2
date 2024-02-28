//declare map variable globally so all functions have access
var map;
var minValue;

//step 1 create map
function createMap(){

    //create the map
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};

function calcMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each country
    for(var city of data.features){
        //loop through each year
        for(var year = 2016; year <= 2022; year+=1){
              //get GDP for current year
              var value = city.properties[String(year) + " [YR" + String(year) + "]"];
              //add value to array
              allValues.push(value);
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)

    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 0.5;
    //Flannery Appearance Compensation formula
    var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius

    return radius;
};
//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#955251",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);
console.log(feature.properties);
    var popupContent = "<p><b>Country:</b> " + feature.properties.CountryName + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split(" ")[0];
    popupContent += "<p><b>GDP in " + year + ":</b> $" + feature.properties[attribute] + "</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius) 
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>Country:</b> " + props.CountryName + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split(" ")[0];
            popupContent += "<p><b>GDP in " + year + ":</b> $" + props[attribute] + "</p>";

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};

function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse"></button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward"></button>');
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/bArrow.png'>")
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/fArrow.png'>")

    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 6: get the new index value
        var index = this.value;
        updatePropSymbols(attributes[index]);
    });

    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;
            updatePropSymbols(attributes[index]);
        })
    })
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;
    console.log("pD",properties);
    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("[YR") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

//Import GeoJSON data
function getData(map){
    //load the data
    fetch("data/GDP.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
            minValue = calcMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap)