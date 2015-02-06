/* =========================================================
 * ng-scrollable.js v0.1.0
 * http://github.com/echa/ng-scrollable
 * =========================================================
 * Copyright 2014 Alexander Eichhorn
 *
 * The MIT License (MIT) Copyright (c) 2014 Alexander Eichhorn.
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

.directive('ngScrollable', [
  '$document',
  '$window',
  '$timeout',

  function ($document, $window, $timeout) {
    'use strict';

    var defaultOpts = {
      scrollX: 'bottom',
      scrollY: 'right',
      scrollXSlackSpace: 0,
      scrollYSlackSpace: 0,
      wheelSpeed: 1,
      minSliderLength: 10,
      useBothWheelAxes: false,
      useKeyboard: true,
      updateOnResize: true,
    };

    return {
      restrict: 'A',
      replace: true,
      transclude: true,
      template: "<div class=\"scrollable\"><div class=\"scrollable-content\" ng-transclude></div><div class='scrollable-bar scrollable-bar-x'><div class='scrollable-slider'></div></div><div class='scrollable-bar scrollable-bar-y'><div class='scrollable-slider'></div></div></div>",
      link: function ($scope, element, attrs) {
        var
        config = angular.extend({}, defaultOpts, $scope.$eval(attrs.ngScrollable)),
        dom = {
          window: angular.element($window),
          content: angular.element(element.children()[0]),
          barX: angular.element(element.children()[1]),
          barY: angular.element(element.children()[2]),
          sliderX: angular.element(angular.element(element.children()[1]).children()[0]),
          sliderY: angular.element(angular.element(element.children()[2]).children()[0]),
        },
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

        toPix = function (v) { return v.toFixed(3) + 'px'; },
        clamp = function (val, min, max) {
          return Math.max(min, Math.min(val, max));
        },
        updateSliderX = function () {
          var t;
          if (isXActive) {
            xSliderWidth = Math.max(config.minSliderLength, parseInt(containerWidth * containerWidth / contentWidth, 10));
            xSliderLeft = parseInt(contentLeft * (containerWidth - xSliderWidth) / (contentWidth - containerWidth), 10);

            if (xSliderLeft >= containerWidth - xSliderWidth) {
              xSliderLeft = containerWidth - xSliderWidth;
            } else if (xSliderLeft < 0) {
              xSliderLeft = 0;
            }
            t = 'translate(' + toPix(xSliderLeft) + ',0)';
            dom.sliderX.css({transform: t, '-webkit-transform': t, width: toPix(xSliderWidth)});
          } else {
            xSliderWidth = xSliderLeft = 0;
            t = 'translate(0,0)';
            dom.sliderX.css({transform: t, '-webkit-transform': t, width: 0});
          }
        },
        updateSliderY = function () {
          var t;
          if (isYActive) {
            ySliderHeight = Math.max(config.minSliderLength, parseInt(containerHeight * containerHeight / contentHeight, 10));
            ySliderTop = parseInt(contentTop * (containerHeight - ySliderHeight) / (contentHeight - containerHeight), 10);

            if (ySliderTop >= containerHeight - ySliderHeight) {
              ySliderTop = containerHeight - ySliderHeight;
            } else if (ySliderTop < 0) {
              ySliderTop = 0;
            }
            t = 'translate(0,' + toPix(ySliderTop) + ')';
            dom.sliderY.css({transform: t, '-webkit-transform': t, height: toPix(ySliderHeight)});
          } else {
            ySliderTop = ySliderHeight = 0;
            t = 'translate(0,0)';
            dom.sliderY.css({transform: t, '-webkit-transform': t, height: 0});
          }
        },
        updateBarX = function () {
          var scrollbarXStyles = {left: 0, width: toPix(containerWidth), display: isXActive ? "inherit": "none"};
          switch (config.scrollX) {
          case 'bottom':
            scrollbarXStyles.bottom = 0;
            dom.content[isXActive ? 'addClass':'removeClass']('scrollable-bottom');
            break;
          case 'top':
            scrollbarXStyles.top = 0;
            dom.content[isXActive ? 'addClass':'removeClass']('scrollable-top');
            break;
          }
          dom.barX.css(scrollbarXStyles);
        },
        updateBarY = function () {
          var scrollbarYStyles = {top: 0, height: toPix(containerHeight), display: isYActive ? "inherit": "none"};
          switch (config.scrollY) {
          case 'right':
            scrollbarYStyles.right = 0;
            dom.content[isYActive ? 'addClass':'removeClass']('scrollable-right');
            break;
          case 'left':
            scrollbarYStyles.left = 0;
            dom.content[isYActive ? 'addClass':'removeClass']('scrollable-left');
            break;
          }
          dom.barY.css(scrollbarYStyles);
        },
        scrollTo = function (left, top) {
          // clamp to 0 .. content{Height|Width} - container{Height|Width}
          contentTop = clamp(top, 0, contentHeight - containerHeight);
          contentLeft = clamp(left, 0, contentWidth - containerWidth);
          var t = 'translate(' + toPix(-contentLeft) + ',' + toPix(-contentTop) + ')';
          dom.content.css({ transform: t, '-webkit-transform': t });
        },
        scrollX = function (pos) {
          scrollTo(pos, contentTop);
          updateSliderX();
        },
        scrollY = function (pos) {
          scrollTo(contentLeft, pos);
          updateSliderY();
        },
        refresh = function () {
          // read DOM
          containerWidth = element[0].offsetWidth; // innerWidth() : element[0].width();
          containerHeight = element[0].offsetHeight; // innerHeight() : element[0].height();
          contentWidth = dom.content[0].scrollWidth;
          contentHeight = dom.content[0].scrollHeight;

          // activate scrollbars
          if (config.scrollX !== 'none' && containerWidth + config.scrollXSlackSpace < contentWidth) {
            isXActive = true;
          }
          else {
            isXActive = false;
            scrollX(0);
          }

          if (config.scrollY !== 'none' && containerHeight + config.scrollYSlackSpace < contentHeight) {
            isYActive = true;
          }
          else {
            isYActive = false;
            scrollY(0);
          }

          // update UI
          updateBarX();
          updateBarY();
          updateSliderX();
          updateSliderY();
        },
        stop = function (e, prevent) {
          e.stopPropagation();
          if (prevent) { e.preventDefault(); }
        },
        onMouseDownX = function (e) {
          dragStartPageX = e.pageX;
          dragStartLeft = contentLeft;
          isXScrolling = true;
          element.addClass('active');
          stop(e, true);
        },
        onMouseMoveX = function (e) {
          if (isXScrolling) {
            // scale slider move to content width
            var deltaSlider = e.pageX - dragStartPageX,
                deltaContent = parseInt(deltaSlider * (contentWidth - containerWidth) / (containerWidth - xSliderWidth), 10);
            scrollX(dragStartLeft + deltaContent);
            stop(e, true);
          }
        },
        onMouseUpX = function (e) {
          if (isXScrolling) {
            isXScrolling = false;
            element.removeClass('active');
            dragStartLeft = dragStartPageX = null;
          }
        },
        onMouseDownY = function (e) {
          dragStartPageY = e.pageY;
          dragStartTop = contentTop;
          isYScrolling = true;
          element.addClass('active');
          stop(e, true);
        },
        onMouseMoveY =  function (e) {
          if (isYScrolling) {
            var deltaSlider = e.pageY - dragStartPageY,
                deltaContent = parseInt(deltaSlider * (contentHeight - containerHeight) / (containerHeight - ySliderHeight), 10);

            scrollY(dragStartTop + deltaContent);
            stop(e, true);
          }
        },
        onMouseUpY =  function (e) {
          if (isYScrolling) {
            isYScrolling = false;
            element.removeClass('active');
            dragStartTop = dragStartPageY = null;
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
        },
        clickBarY = function (e) {
          var halfOfScrollbarLength = parseInt(ySliderHeight / 2, 10),
              positionTop = e.clientY - dom.barY[0].getBoundingClientRect().top - halfOfScrollbarLength,
              maxPositionTop = containerHeight - ySliderHeight,
              positionRatio = clamp(positionTop / maxPositionTop, 0, 1);
          scrollY((contentHeight - containerHeight) * positionRatio);
        },
        hoverOn = function () { hovered = true; },
        hoverOff = function () { hovered = false; },
        handleKey = function (e) {
          var deltaX = 0, deltaY = 0, s = 30;
          if (!hovered || $document[0].activeElement.isContentEditable ||
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
          e.preventDefault();
        },
        handleWheel = function (e) {
          // with jquery use e.originalEvent.deltaX!!!
          // Safari/Webkit: e.wheelDeltaX (event contains negative coordinates)
          // FF30, Chrome35: e.deltaX
          e = e.originalEvent || e;
          var deltaX = (angular.isDefined(e.wheelDeltaX) ? -e.wheelDeltaX : e.deltaX) * config.wheelSpeed,
              deltaY = (angular.isDefined(e.wheelDeltaY) ? -e.wheelDeltaY : e.deltaY) * config.wheelSpeed;

          // avoid flickering in Chrome: disabled animated translate
          element.addClass('active');
          $timeout.cancel(activeTimeout);
          activeTimeout = $timeout(function () {element.removeClass('active'); }, 500);

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

          // update bar position
          refresh();

          // prevent default scrolling
          stop(e, true);
        };


        // init
        refresh();

        // bind event handlers
        // sent by controllers of transcluded content on change
        $scope.$on('content.changed', function () {
          // defer to next digest
          $timeout(function () {
            // update DOM node reference (because ui-view replaces nodes)
            dom.content = angular.element(element.children()[0]);
            // refresh scrollbars
            refresh();
          });
        });

        // bind DOM element handlers
        if (config.updateOnResize) { dom.window.on('resize', refresh); }
        // scrollbar click
        dom.sliderX.on('click', stop);
        dom.barX.on('click', clickBarX);
        dom.sliderY.on('click', stop);
        dom.barY.on('click', clickBarY);
        // slider drag
        dom.sliderX.on('mousedown', onMouseDownX);
        $document.on('mousemove', onMouseMoveX);
        $document.on('mouseup', onMouseUpX);
        dom.sliderY.on('mousedown', onMouseDownY);
        $document.on('mousemove', onMouseMoveY);
        $document.on('mouseup', onMouseUpY);
        // keyboard
        if (config.useKeyboard) {
          element.on('mouseenter', hoverOn);
          element.on('mouseleave', hoverOff);
          $document.on('keydown', handleKey);
        }
        // mouse wheel
        element.on('wheel', handleWheel);
        element.on('mousewheel', handleWheel);


        // (un)register event handlers on scope destroy for proper cleanup
        $scope.$on('$destroy', function () {
          $timeout.cancel(activeTimeout);
          if (config.updateOnResize) { dom.window.off('resize', refresh); }
          dom.sliderX.off('click', stop);
          dom.barX.off('click', clickBarX);
          dom.sliderY.off('click', stop);
          dom.barY.off('click', clickBarY);
          // slider drag
          dom.sliderX.off('mousedown', onMouseDownX);
          $document.off('mousemove', onMouseMoveX);
          $document.off('mouseup',   onMouseUpX);
          dom.sliderY.off('mousedown', onMouseDownY);
          $document.off('mousemove', onMouseMoveY);
          $document.off('mouseup',   onMouseUpY);
          // keyboard
          if (config.useKeyboard) {
            element.off('mouseenter', hoverOn);
            element.off('mouseleave', hoverOff);
            $document.off('keydown', handleKey);
          }
          // mouse wheel
          element.off('wheel', handleWheel);
          element.off('mousewheel', handleWheel);
        });
      }
    };
  }
]);
