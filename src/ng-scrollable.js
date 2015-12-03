/* =========================================================
 * ng-scrollable.js
 * http://github.com/echa/ng-scrollable
 * =========================================================
 * Copyright 2014-2015 Alexander Eichhorn
 *
 * The MIT License (MIT) Copyright (c) 2014-2015 Alexander Eichhorn.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 * ========================================================= */

angular.module('ngScrollable', [])

.directive('ngScrollable', ['$injector', function ($injector) {
    'use strict';

    // dependencies
    var $document        = $injector.get('$document');
    var $interval        = $injector.get('$interval');
    var $timeout         = $injector.get('$timeout');
    var $window          = $injector.get('$window');
    var $parse           = $injector.get('$parse');
    var extend           = angular.extend;
    var element          = angular.element;
    var isDefined        = angular.isDefined;
    var isTouchDevice    = typeof $window.ontouchstart !== 'undefined';
    var xform            = 'transform';

    // use requestAnimationFrame for kinetic scrolling
    var $$rAF = $window.requestAnimationFrame || $window.webkitRequestAnimationFrame;

    // use MutationObserver to auto-refresh on DOM changes
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

    // Angular used to contain an internal service that is using a task queue
    // in 1.4.x which makes it incompatible with smooth scrolling
    //
    // var $$rAF            = $injector.get('$$rAF');

    // find the correct CSS transform feature class name
    ['webkit', 'moz', 'o', 'ms'].every(function (prefix) {
      var e = prefix + 'Transform';
      var body = $document.find('body').eq(0);
      if (typeof body[0].style[e] !== 'undefined') {
        xform = e;
        return false;
      }
      return true;
    });

    var defaultOpts = {
      id: 0,
      scrollX: 'bottom',
      scrollY: 'right',
      scrollXSlackSpace: 0,
      scrollYSlackSpace: 0,
      scrollXAlways: false,
      scrollYAlways: false,
      usePadding: false,
      useObserver: true,
      wheelSpeed: 1,
      minSliderLength: 10,
      useBothWheelAxes: false,
      useKeyboard: true,
      preventKeyEvents: true,
      updateOnResize: true,
      kineticTau: 325
    };

    return {
      restrict: 'A',
      transclude: true,
      template: "<div class=\"scrollable\"><div class=\"scrollable-content\" ng-transclude></div><div class='scrollable-bar scrollable-bar-x'><div class='scrollable-slider'></div></div><div class='scrollable-bar scrollable-bar-y'><div class='scrollable-slider'></div></div></div>",
      link: function ($scope, elem, attrs) {
        var
        config = extend({}, defaultOpts, $scope.$eval(attrs.ngScrollable)),
        el = element(elem.children()[0]),
        dom = {
          window: element($window),
          el: el,
          content: element(el.children()[0]),
          barX: element(el.children()[1]),
          barY: element(el.children()[2]),
          sliderX: element(element(el.children()[1]).children()[0]),
          sliderY: element(element(el.children()[2]).children()[0])
        },
        domObserver,
        isXActive = false,
        isYActive = false,
        containerWidth = 0,
        containerHeight = 0,
        contentWidth = 0,
        contentHeight = 0,
        contentTop = 0,
        contentLeft = 0,
        xSliderWidth = 0,
        xSliderLeft = 0,
        ySliderHeight = 0,
        ySliderTop = 0,
        dragStartLeft = null,
        dragStartPageX = null,
        dragStartTop = null,
        dragStartPageY = null,
        isXScrolling = false,
        isYScrolling = false,
        hovered = false,
        activeTimeout,
        spySetter = {},
        // kinetic scrolling
        velocityX = 0,
        amplitudeX = 0,
        frameX = 0,
        targetX = 0,
        velocityY = 0,
        amplitudeY = 0,
        frameY = 0,
        targetY = 0,
        trackTime,
        trackerTimeout,

        toPix = function (v) { return v.toFixed(3) + 'px'; },
        clamp = function (val, min, max) {
          return Math.max(min, Math.min(val, max));
        },
        updateSliderX = function () {
          // adjust container width by the amount of border pixels so that the
          // slider does not extend outside the bar region
          var cw = containerWidth - 3;
          if (isXActive) {
            xSliderWidth = Math.max(config.minSliderLength, parseInt(cw * cw / contentWidth, 10));
            xSliderLeft = parseInt(contentLeft * (cw - xSliderWidth) / (contentWidth - cw), 10);

            if (xSliderLeft >= cw - xSliderWidth) {
              xSliderLeft = cw - xSliderWidth;
            } else if (xSliderLeft < 0) {
              xSliderLeft = 0;
            }
            dom.sliderX[0].style[xform] = 'translate3d(' + toPix(xSliderLeft) + ',0,0)';
            dom.sliderX[0].style.width = toPix(xSliderWidth);
          } else {
            xSliderWidth = xSliderLeft = 0;
            dom.sliderX[0].style[xform] = 'translate3d(0,0,0)';
            dom.sliderX[0].style.width = '0';
          }
        },
        updateSliderY = function () {
          // adjust container height by the amount of border pixels so that the
          // slider does not extend outside the bar region
          var ch = containerHeight - 3;
          if (isYActive) {
            ySliderHeight = Math.max(config.minSliderLength, parseInt(ch * ch / contentHeight, 10));
            ySliderTop = parseInt(contentTop * (ch - ySliderHeight) / (contentHeight - ch), 10);

            if (ySliderTop >= ch - ySliderHeight) {
              ySliderTop = ch - ySliderHeight;
            } else if (ySliderTop < 0) {
              ySliderTop = 0;
            }
            dom.sliderY[0].style[xform] = 'translate3d(0,' + toPix(ySliderTop) + ',0)';
            dom.sliderY[0].style.height = toPix(ySliderHeight);
          } else {
            ySliderTop = ySliderHeight = 0;
            dom.sliderY[0].style[xform] = 'translate3d(0,0,0)';
            dom.sliderY[0].style.height = '0';
          }
        },
        updateBarX = function () {
          var showAlways = config.scrollXAlways,
              scrollbarXStyles = {left: 0, width: toPix(containerWidth), display: isXActive || showAlways ? "inherit" : "none"};
          switch (config.scrollX) {
          case 'bottom':
            scrollbarXStyles.bottom = 0;
            dom.content[isXActive || showAlways ? 'addClass' : 'removeClass']('scrollable-bottom');
            dom.barX[isXActive || showAlways ? 'addClass' : 'removeClass']('scrollable-bottom');
            break;
          case 'top':
            scrollbarXStyles.top = 0;
            dom.content[isXActive || showAlways ? 'addClass' : 'removeClass']('scrollable-top');
            dom.barX[isXActive || showAlways ? 'addClass' : 'removeClass']('scrollable-top');
            break;
          }
          dom.barX.css(scrollbarXStyles);
          dom.sliderX[0].style.display = isXActive ? 'inherit' : 'none';
        },
        updateBarY = function () {
          var showAlways = config.scrollYAlways,
              scrollbarYStyles = {top: 0, height: toPix(containerHeight), display: isYActive || showAlways ? "inherit" : "none"};
          switch (config.scrollY) {
          case 'right':
            scrollbarYStyles.right = 0;
            dom.content[isYActive || showAlways ? 'addClass' : 'removeClass']('scrollable-right');
            dom.barY[isYActive || showAlways ? 'addClass' : 'removeClass']('scrollable-right');
            break;
          case 'left':
            scrollbarYStyles.left = 0;
            dom.content[isYActive || showAlways ? 'addClass' : 'removeClass']('scrollable-left');
            dom.barY[isYActive || showAlways ? 'addClass' : 'removeClass']('scrollable-left');
            break;
          }
          dom.barY.css(scrollbarYStyles);
          dom.sliderY[0].style.display = isYActive ? 'inherit' : 'none';
        },
        scrollTo = function (left, top) {
          // clamp to 0 .. content{Height|Width} - container{Height|Width}
          contentTop = clamp(top, 0, contentHeight - containerHeight);
          contentLeft = clamp(left, 0, contentWidth - containerWidth);
          dom.content[0].style[xform] = 'translate3d(' + toPix(-contentLeft) + ',' + toPix(-contentTop) + ',0)';
          // update external scroll spies
          if (spySetter.spyX) {
            spySetter.spyX($scope, parseInt(contentLeft, 10));
          }
          if (spySetter.spyY) {
            spySetter.spyY($scope, parseInt(contentTop, 10));
          }
        },
        scrollX = function (pos) {
          if (!isXActive) { return; }
          scrollTo(pos, contentTop);
          updateSliderX();
        },
        scrollY = function (pos) {
          if (!isYActive) { return; }
          scrollTo(contentLeft, pos);
          updateSliderY();
        },
        refresh = function (event, noNotify) {
          // read DOM
          containerWidth = config.usePadding ? dom.el[0].clientWidth : dom.el[0].offsetWidth; // innerWidth() : elm[0].width();
          containerHeight = config.usePadding ? dom.el[0].clientHeight : dom.el[0].offsetHeight; // elm[0].innerHeight() : elm[0].height();
          contentWidth = dom.content[0].scrollWidth;
          contentHeight = dom.content[0].scrollHeight;

          // activate scrollbars
          if (config.scrollX !== 'none' && containerWidth + config.scrollXSlackSpace < contentWidth) {
            isXActive = true;
          }
          else {
            scrollX(0);
            isXActive = false;
          }

          if (config.scrollY !== 'none' && containerHeight + config.scrollYSlackSpace < contentHeight) {
            isYActive = true;
          }
          else {
            scrollY(0);
            isYActive = false;
          }

          // update UI
          updateBarX();
          updateBarY();
          updateSliderX();
          updateSliderY();

          // make sure scroll position isn't beyond content bounds
          if (contentWidth < contentLeft + xSliderLeft + xSliderWidth) {
            scrollX(xSliderLeft);
          }
          if (contentHeight < contentTop + ySliderTop + ySliderHeight) {
            scrollY(ySliderTop);
          }

          // broadcast the new dimensions down the scope stack so inner content
          // controllers can react appropriately
          if (!noNotify) {
            $scope.$broadcast('scrollable.dimensions', containerWidth, containerHeight, contentWidth, contentHeight, config.id);
          }
        },
        stop = function (e, prevent) {
          e.stopPropagation();
          if (prevent) { e.preventDefault(); }
          return false;
        },
        ypos = function (e) {
          e = e.originalEvent || e;
          // touch event
          if (e.targetTouches && (e.targetTouches.length >= 1)) {
            return e.targetTouches[0].pageY;
          }
          // mouse event
          return e.pageY;
        },
        xpos = function (e) {
          e = e.originalEvent || e;
          // touch event
          if (e.targetTouches && (e.targetTouches.length >= 1)) {
            return e.targetTouches[0].pageX;
          }
          // mouse event
          return e.pageX;
        },
        track = function () {
          var now, elapsed, delta, v;

          now = Date.now();
          elapsed = now - trackTime;
          trackTime = now;

          // X
          delta = contentLeft - frameX;
          frameX = contentLeft;
          v = 1000 * delta / (1 + elapsed);
          velocityX = 0.8 * v + 0.2 * velocityX;
          // Y
          delta = contentTop - frameY;
          frameY = contentTop;
          v = 1000 * delta / (1 + elapsed);
          velocityY = 0.8 * v + 0.2 * velocityY;

        },
        autoScrollX = function () {
          var elapsed, delta;
          if (amplitudeX) {
            elapsed = Date.now() - trackTime;
            delta = -amplitudeX * Math.exp(-elapsed / config.kineticTau);
            if (delta > 0.5 || delta < -0.5) {
              scrollX(targetX + delta);
              $$rAF(autoScrollX);
            } else {
              scrollX(targetX);
            }
          }
        },
        autoScrollY = function () {
          var elapsed, delta;
          if (amplitudeY) {
            elapsed = Date.now() - trackTime;
            delta = -amplitudeY * Math.exp(-elapsed / config.kineticTau);
            if (delta > 0.5 || delta < -0.5) {
              scrollY(targetY + delta);
              $$rAF(autoScrollY);
            } else {
              scrollY(targetY);
            }
          }
        },
        onMouseDownX = function (e) {
          dragStartPageX = xpos(e);
          dragStartLeft = contentLeft;
          isXScrolling = true;
          velocityX = amplitudeX = 0;
          frameX = contentLeft;
          if (!trackerTimeout) { trackerTimeout = $interval(track, 100); }
          dom.el.addClass('active');
          return isTouchDevice || stop(e, !isTouchDevice);
        },
        onMouseMoveX = function (e) {
          if (isXScrolling) {
            // scale slider move to content width
            var deltaSlider = xpos(e) - dragStartPageX,
                deltaContent = isTouchDevice ? -deltaSlider : parseInt(deltaSlider * (contentWidth - containerWidth) / (containerWidth - xSliderWidth), 10);
            scrollX(dragStartLeft + deltaContent);
            return stop(e, true);
          }
        },
        onMouseUpX = function (e) {
          if (isXScrolling) {
            isXScrolling = false;
            dom.el.removeClass('active');
            dragStartLeft = dragStartPageX = null;

            // kinetic scroll
            if (trackerTimeout) { $interval.cancel(trackerTimeout); trackerTimeout = null; }
            if (velocityX > 10 || velocityX < -10) {
              amplitudeX = 0.8 * velocityX;
              targetX = Math.round(contentLeft + amplitudeX);
              trackTime = Date.now();
              $$rAF(autoScrollX);
            }
            return isTouchDevice || stop(e, !isTouchDevice);
          }
        },
        onMouseDownY = function (e) {
          dragStartPageY = ypos(e);
          dragStartTop = contentTop;
          isYScrolling = true;
          velocityY = amplitudeY = 0;
          frameY = contentTop;
          if (!trackerTimeout) { trackerTimeout = $interval(track, 100); }
          dom.el.addClass('active');
          return isTouchDevice || stop(e, !isTouchDevice);
        },
        onMouseMoveY =  function (e) {
          if (isYScrolling) {
            var deltaSlider = ypos(e) - dragStartPageY,
                deltaContent = isTouchDevice ? -deltaSlider : parseInt(deltaSlider * (contentHeight - containerHeight) / (containerHeight - ySliderHeight), 10);
            scrollY(dragStartTop + deltaContent);
            return stop(e, true);
          }
        },
        onMouseUpY =  function (e) {
          if (isYScrolling) {
            isYScrolling = false;
            dom.el.removeClass('active');
            dragStartTop = dragStartPageY = null;

            // kinetic scroll
            if (trackerTimeout) { $interval.cancel(trackerTimeout); trackerTimeout = null; }
            if (velocityY > 10 || velocityY < -10) {
              amplitudeY = 0.8 * velocityY;
              targetY = Math.round(contentTop + amplitudeY);
              trackTime = Date.now();
              $$rAF(autoScrollY);
            }
            return isTouchDevice || stop(e, true);
          }
        },
        // Get Offset without jquery
        // element.prop('offsetTop')
        // element[0].getBoundingClientRect().top
        clickBarX = function (e) {
          var halfOfScrollbarLength = parseInt(xSliderWidth / 2, 10),
              positionLeft = e.clientX - dom.barX[0].getBoundingClientRect().left - halfOfScrollbarLength,
              maxPositionLeft = containerWidth - xSliderWidth,
              positionRatio = clamp(positionLeft / maxPositionLeft, 0, 1);
          scrollX((contentWidth - containerWidth) * positionRatio);
          $scope.$digest();
        },
        clickBarY = function (e) {
          var halfOfScrollbarLength = parseInt(ySliderHeight / 2, 10),
              positionTop = e.clientY - dom.barY[0].getBoundingClientRect().top - halfOfScrollbarLength,
              maxPositionTop = containerHeight - ySliderHeight,
              positionRatio = clamp(positionTop / maxPositionTop, 0, 1);
          scrollY((contentHeight - containerHeight) * positionRatio);
          $scope.$digest();
        },
        hoverOn = function () { hovered = true; },
        hoverOff = function () { hovered = false; },
        handleKey = function (e) {
          var deltaX = 0, deltaY = 0, s = 30;
          if (!hovered ||
            $document[0].activeElement.isContentEditable ||
            $document[0].activeElement.nodeName === 'INPUT' ||
            e.altKey || e.ctrlKey || e.metaKey) {
            return;
          }

          switch (e.which) {
          case 37: // left
            deltaX = -s;
            break;
          case 38: // up
            deltaY = s;
            break;
          case 39: // right
            deltaX = s;
            break;
          case 40: // down
            deltaY = -s;
            break;
          case 33: // page up
            deltaY = containerHeight;
            break;
          case 32: // space bar
          case 34: // page down
            deltaY = -containerHeight;
            break;
          case 35: // end
            if (isYActive && !isXActive) {
              deltaY = -contentHeight;
            } else {
              deltaX = containerHeight;
            }
            break;
          case 36: // home
            if (isYActive && !isXActive) {
              deltaY = contentHeight;
            } else {
              deltaX = -containerHeight;
            }
            break;
          default:
            return;
          }

          scrollY(contentTop - deltaY);
          scrollX(contentLeft + deltaX);

          // prevent default scrolling
          if (config.preventKeyEvents) {
            e.preventDefault();
          }
          $scope.$digest();
        },
        handleWheel = function (e) {
          // with jquery use e.originalEvent.deltaX!!!
          e = e.originalEvent || e;
          var deltaX = e.deltaX * config.wheelSpeed,
              deltaY = e.deltaY * config.wheelSpeed;

          // avoid flickering in Chrome: disabled animated translate
          dom.el.addClass('active');
          $timeout.cancel(activeTimeout);
          activeTimeout = $timeout(function () {dom.el.removeClass('active'); }, 500);

          if (!config.useBothWheelAxes) {
            // deltaX will only be used for horizontal scrolling and deltaY will
            // only be used for vertical scrolling - this is the default
            scrollY(contentTop + deltaY);
            scrollX(contentLeft + deltaX);
          } else if (isYActive && !isXActive) {
            // only vertical scrollbar is active and useBothWheelAxes option is
            // active, so let's scroll vertical bar using both mouse wheel axes
            if (deltaY) {
              scrollY(contentTop + deltaY);
            } else {
              scrollY(contentTop + deltaX);
            }
          } else if (isXActive && !isYActive) {
            // useBothWheelAxes and only horizontal bar is active, so use both
            // wheel axes for horizontal bar
            if (deltaX) {
              scrollX(contentLeft + deltaX);
            } else {
              scrollX(contentLeft + deltaY);
            }
          }

          // prevent default scrolling
          stop(e, true);
          $scope.$digest();
        },

        registerHandlers = function () {

          // use MutationObserver
          if (config.useObserver && MutationObserver) {

            var observerConfig = {
              // attributes: true, // Note: inefficient on large DOM + Angular!!
              childList: true,
              // characterData: true,
              subtree: true
            };

            // create observer and debounce calls
            domObserver = new MutationObserver(function () {
              $$rAF(refresh);
            });

            // bind observer to scrollable content
            domObserver.observe(dom.content[0], observerConfig);
          }

          // bind DOM element handlers
          if (config.updateOnResize) { dom.window.on('resize', refresh); }

          if (config.scrollX !== 'none') {

            // scrollbar clicks
            dom.sliderX.on('click', stop);
            dom.barX.on('click',    clickBarX);

            if (isTouchDevice) {

              // content touch/drag
              dom.el.on('touchstart', onMouseDownX);
              dom.el.on('touchmove',  onMouseMoveX);
              dom.el.on('touchend',   onMouseUpX);

            } else {

              // slider drag
              dom.sliderX.on('mousedown', onMouseDownX);
              $document.on('mousemove', onMouseMoveX);
              $document.on('mouseup',   onMouseUpX);

            }
          }

          if (config.scrollY !== 'none') {

            // scrollbar clicks
            dom.sliderY.on('click', stop);
            dom.barY.on('click',    clickBarY);


            if (isTouchDevice) {

              // content touch/drag
              dom.el.on('touchstart', onMouseDownY);
              dom.el.on('touchmove',  onMouseMoveY);
              dom.el.on('touchend',   onMouseUpY);

            } else {

              // slider drag
              dom.sliderY.on('mousedown', onMouseDownY);
              $document.on('mousemove',   onMouseMoveY);
              $document.on('mouseup',     onMouseUpY);

            }
          }

          // mouse wheel
          if (!isTouchDevice) {
            dom.el.on('wheel',      handleWheel);
          }

          // keyboard
          if (config.useKeyboard && !isTouchDevice) {
            dom.el.on('mouseenter', hoverOn);
            dom.el.on('mouseleave', hoverOff);
            $document.on('keydown', handleKey);
          }

        },

        unregisterHandlers = function () {

          // disconnect observer
          if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
          }

          // global resize event
          if (config.updateOnResize) { dom.window.off('resize', refresh); }

          // slider events
          dom.sliderX.off('click', stop);
          dom.barX.off('click',    clickBarX);
          dom.sliderY.off('click', stop);
          dom.barY.off('click',    clickBarY);

          // touch
          if (isTouchDevice) {
            dom.el.off('touchstart', onMouseDownX);
            dom.el.off('touchmove',  onMouseMoveX);
            dom.el.off('touchend',   onMouseUpX);
            dom.el.off('touchstart', onMouseDownY);
            dom.el.off('touchmove',  onMouseMoveY);
            dom.el.off('touchend',   onMouseUpY);
          } else {

            // slider drag
            dom.sliderX.off('mousedown', onMouseDownX);
            $document.off('mousemove',   onMouseMoveX);
            $document.off('mouseup',     onMouseUpX);

            dom.sliderY.off('mousedown', onMouseDownY);
            $document.off('mousemove',   onMouseMoveY);
            $document.off('mouseup',     onMouseUpY);

            // keyboard
            if (config.useKeyboard) {
              // mouse hovering activates keyboard capture
              dom.el.off('mouseenter', hoverOn);
              dom.el.off('mouseleave', hoverOff);
              $document.off('keydown', handleKey);
            }

            // mouse wheel
            dom.el.off('wheel',      handleWheel);
          }

        };


        $scope.$on('content.reload', function (e, noNotify) {

          // try unregistering event handlers
          unregisterHandlers();

          // defer to next digest
          $timeout(function () {

            // update DOM node reference (because ui-view replaces nodes)
            dom.el = element(elem.children()[0]);
            dom.content = element(dom.el.children()[0]);

            // register handlers
            registerHandlers();

            // refresh scrollbars
            refresh(e, noNotify);

          });

        });

        // sent by controllers of transcluded content on change
        $scope.$on('content.changed', function (e, wait, noNotify) {

          // ms to wait before refresh
          wait = wait || 100;

          // defer to next digest
          $timeout(function () {

            // refresh scrollbars
            refresh(e, noNotify);

          }, wait);

          e.preventDefault();
        });


        // may be broadcast from outside to scroll to content edges
        $scope.$on('scrollable.scroll.left', function () {
          // defer to next digest
          $scope.$applyAsync(function () { scrollX(0); });
        });

        $scope.$on('scrollable.scroll.right', function () {
          // defer to next digest
          $scope.$applyAsync(function () { scrollX(contentWidth); });
        });

        $scope.$on('scrollable.scroll.top', function () {
          // defer to next digest
          $scope.$applyAsync(function () { scrollY(0); });
        });

        $scope.$on('scrollable.scroll.bottom', function () {
          // defer to next digest
          $scope.$applyAsync(function () { scrollY(contentHeight); });
        });

        // (un)register event handlers on scope destroy
        $scope.$on('$destroy', function () {
          $timeout.cancel(activeTimeout);
          unregisterHandlers();
        });

        // init
        registerHandlers();
        refresh();

        // watch and set spy attribute value expressions
        angular.forEach(['spyX', 'spyY'], function (attr) {
          if (attrs[attr]) {
            // keep a setter to the spy expression (if settable)
            spySetter[attr] = $parse(attrs[attr]).assign;
            // watch the spy expression
            $scope.$watch(attrs[attr], function (val) {
              switch (attr) {
              case 'spyX' :
                scrollX(val);
                break;
              case 'spyY' :
                scrollY(val);
                break;
              }
            });
          }
        });
      }
    };
  }
]);
