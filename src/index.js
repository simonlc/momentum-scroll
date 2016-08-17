/**
 * Suported props:
 *
 * transform:
 * translateX(2em);
 * translateY(3in);
 * scaleX(2);
 * scaleY(0.5);
 * rotate(0.5turn);
 * skewX(30deg);
 * skewY(1.07rad);
 * translateZ(2px);
 * scaleZ(0.3);
 * rotateX(10deg);
 * rotateY(10deg);
 * rotateZ(10deg);
 * perspective(17px);
 *
 * Other:
 * Opacity
 */

var $document = $(document);

function Momentum() {
  /* PUBLIC VARIABLES */
  this.round = 1000;

  /* PRIVATE VARIABLES */
  this.RAF = null;
  this.momentums = [];
  this.inited = false;
  this.running = 0;
}

Momentum.prototype.init = function init() {
  if (this.inited) {
    this.inited = true;
    return;
  }

  // TODO Allow this to be dynamic
  // if user choses not to init, have him be able to create the onscroll event
  this.createMomentums();

  $(window).on('scroll', function() {
    // Restart script if we stopped it
    if (this.running) return;
    this.onScroll();
  }.bind(this));

  this.onScroll(true);
}

Momentum.prototype.stop = function stop() {
  window.cancelAnimationFrame(this.RAF);
}

/**
 * Creates momentum instances from data attributes.
 * Can pass a context to scope the function.
 * @public
 */
Momentum.prototype.createMomentums = function createMomentums(parent) {
  parent = parent || '';
  // Destroys old momentums (let GC clean up)
  this.momentums.length = 0;
  $(parent + ' [data-momentum]').each(function(index, el) {
    // TODO Put this in own function?
    var $el = $(el);
    var data = $el.data('momentum');
    var momentum = {
      element: $el,
      datas: [],
    }

    if ($.isArray(data)) {
      momentum.datas = data;
      momentum.datas.forEach(function(data) {
        this.makeDefaults($el, data);
      }.bind(this));
      this.addMomentum(momentum);
    } else {
      momentum.datas.push(data);
      this.makeDefaults($el, momentum.datas[0]);
      this.addMomentum(momentum);
    }
  }.bind(this));
}

Momentum.prototype.makeDefaults = function makeDefaults($el, data) {
  var windowHeight = $(window).height();
  data.scrollFrom = data['from-scroll'] || Math.max(0, $el.offset().top - windowHeight);
  // TODO: Accept other units such as % (percent of element like transform), vh, vw, etc.
  data.scrollDistance = data['distance'] || $el.height() + windowHeight;
  data.scrollDistance = Math.max(Math.floor(data.scrollDistance), 1);
  data.scrollTo = data['to-scroll'] || data.scrollFrom + data.scrollDistance;
  data.smoothness = data['smoothness'] || 30;

  data.prev = {};
  data.current = {};

  for (key in data.props) {
    var defaultProp = 0;
    var value = parseFloat(data.props[key], 10);
    var unit = data.props[key].toString().replace(/[-\d\.]/g, '');
    if (key.indexOf('scale') === 0 || key === 'opacity') {
      defaultProp = 1;
    }
    // XXX: Wouldn't it be better for the user to set this himself
    // rather than have unexpected behavior?
    if (key === 'translateZ') {
      $el.parent().css('perspective', 800 || data.perspective);
    }


    // TODO:
    // Make the element start halfway down, meet at it's origin in
    // the center of the screen distance (by default).
    var end = value / 2;
    var start = end - value;
    data.prev[key] = defaultProp;
    data.props[key] = { value: value, unit: unit };
    data.current[key] = { value: value, unit: unit };
    // TODO Get current computated style
    // Will have to convert and match units
  };

}

Momentum.prototype.addMomentum = function addMomentum(momentum) {
  this.momentums.push(momentum);
}

Momentum.prototype.onScroll = function onScroll(noSmooth) {
  this.running = 0;
  // XXX: Since on scroll is actually called when not scrolling
  // we could possibly cache this somewhere and save some cycles.
  var scroll = $document.scrollTop();

  for (var i = 0; i < this.momentums.length; ++i) {
    var momentum = this.momentums[i];
    var applyProperties = false;
    var cssTransform = '';

    for (var j = 0; j < momentum.datas.length; ++j) {
      var data = momentum.datas[j];
      var smoothness = data.smoothness;
      if (noSmooth || smoothness === 0) smoothness = 1;

      var scrollCurrent = scroll;
      scrollCurrent = Math.max(scrollCurrent, data.scrollFrom);
      scrollCurrent = Math.min(scrollCurrent, data.scrollTo);

      for (var prop in data.props) {
        var value = data.props[prop].value;
        var unit = data.props[prop].unit;

        // TODO: Put this in the momentum object?
        var defaultProp = 0;
        if (prop.indexOf('scale') === 0 || prop === 'opacity') {
          defaultProp = 1;
        }

        var next = (value - defaultProp) * (scrollCurrent - data.scrollFrom) / (data.scrollTo - data.scrollFrom) + defaultProp;
        var val = data.prev[prop] + (next - data.prev[prop]) / smoothness;
        val = Math.ceil(val * this.round) / this.round;

        // what does this do?
        // Probably caps the value
        if (val === data.prev[prop] && next === value) val = value;
        data.current[prop].value = val;

        if (prop === 'opacity') {
          momentum.element.css('opacity', data.current[prop].value);
        } else {
          cssTransform += formatTransform(prop, data.current[prop].value, data.current[prop].unit);
        }
        if (data.prev[prop] !== data.current[prop].value) {
          data.prev[prop] = data.current[prop].value;
          this.running++;
          applyProperties = true;
        }
      }
    }
    if (applyProperties) {
      this.running++;
      momentum.element.css('transform', cssTransform);
    }
  }
  if (this.running === 0) {
    this.stop();
    return;
  }
  this.RAF = window.requestAnimationFrame(this.onScroll.bind(this, false));
}

function formatTransform(key, value, unit) {
  return key + '(' + value + unit + ') ';
}

var momentum = new Momentum();
momentum.init();
