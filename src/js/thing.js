// NPM modules
var d3 = require('d3');
var geo = require('d3-geo-projection');
var topojson = require('topojson');
var _ = require('lodash');

// Local modules
var features = require('./detectFeatures')();
var fm = require('./fm');
var utils = require('./utils');
var geomath = require('./geomath');

// Globals
var MOBILE_BREAKPOINT = 600;
var SIMPLE_LABELS = [{
    'lat': 0,
    'lng': 0,
    'label': 'My label',
    'class': ''
}];

// Map configurations
var configure = require('./maps/usa-counties.js');

// Global vars
var isMobile = false;
var topoData = {};
var fipsData = {};
var identityProjection = null;


/**
 * Initialize the graphic.
 *
 * Fetch data, format data, cache HTML references, etc.
 */
function init() {
    // Used for computing centroids in coordinate space
    identityProjection = d3.geo.path()
        .projection({stream: function(d) { return d; }});

	d3.json('data/geodata.json', function(error, data) {
        // Extract topojson features
        for (var key in data['objects']) {
            topoData[key] = topojson.feature(data, data['objects'][key]);
        }

        d3.csv('data/data.csv', function(error, data) {
            _.each(data, function(d) {
                fipsData[d['fips']] = d;
            })

            render();
            $(window).resize(utils.throttle(onResize, 250));
        });
    });
}

/**
 * Invoke on resize. By default simply rerenders the graphic.
 */
function onResize() {
	render();
}

/**
 * Figure out the current frame size and render the graphic.
 */
function render() {
	var containerWidth = $('#interactive-content').width();

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_BREAKPOINT) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // What kind of map are we making?
    var configuration = configure(containerWidth);

    // Render the map!
    renderMap(configuration, {
        container: '#graphic',
        width: containerWidth,
        data: topoData
    });

    // Resize
    fm.resize();
}

var renderMap = function(typeConfig, instanceConfig) {
    /*
     * Setup
     */
    var topMargin = 0;
    var bottomMargin = 20;

    // Calculate actual map dimensions
    var mapWidth = instanceConfig['width'];
    var mapHeight = Math.ceil(instanceConfig['width'] / typeConfig['aspect_ratio']) + topMargin + bottomMargin;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(instanceConfig['container']);
    containerElement.html('');

    /*
     * Create the map projection.
     */
    var centroid = typeConfig['centroid'];
    var mapScale = mapWidth * typeConfig['scale_factor'];

    var projection = typeConfig['projection']
        .scale(mapScale)
        .translate([mapWidth / 2, mapHeight / 2]);

    var path = d3.geo.path()
        .projection(projection)
        .pointRadius(typeConfig['dot_radius'] * mapScale);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight);

    var mapElement = chartElement.append('g')
        .attr('transform', 'translate(0, ' + topMargin + ')')

    /*
     * Render paths.
     */
    var pathsElement = mapElement.append('g')
        .attr('class', 'paths');

    function classifyFeature(d) {
        var c = [];

        if (d['id']) {
            c.push(utils.classify(d['id']));
        }

        for (var property in d['properties']) {
            var value = d['properties'][property];

            c.push(utils.classify(property + '-' + value));
        }

        return c.join(' ');
    }

    pathsElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(instanceConfig['data']['counties']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) {
                var data = fipsData[parseInt(d['id'])];

                if (!data) {
                    return 'nodata';
                }

                if (!data['eligible']) {
                    return 'nodata';
                }

                var medicaidScale = 'q1';

                if (data['eligible'] >= 25.2) {
                    medicaidScale = 'q4';
                } else if (data['eligible'] >= 19.1) {
                    medicaidScale = 'q3';
                } else if (data['eligible'] >= 13.9) {
                    medicaidScale = 'q2'
                }

                return medicaidScale;
            });

    pathsElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(instanceConfig['data']['states']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', classifyFeature);

    /*
     * Reposition footer.
     */
    d3.selectAll('.footer')
        .style('top', (mapHeight - 10) + 'px')
}

// Bind on-load handler
$(document).ready(function() {
	init();
});
