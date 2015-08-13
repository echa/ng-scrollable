var app = angular.module('app', ['ngScrollable']);

app.controller('Demo', function ($scope) {
    'use strict';

    $scope.posX = 0;
    $scope.posY = 0;

    $scope.red = 0;
    $scope.green = 0;

    $scope.scrollableConfig = {
        customContentWidth: 2000,
        customContentHeight: 1000,
        updateContentPosition: false
    };

    var _containerWidth = 0;
    var _containerHeight = 0;

    $scope.$on('scrollable.dimensions', function(event, containerWidth, containerHeight, contentWidth, contentHeight, id) {
        _containerWidth = containerWidth;
        _containerHeight = containerHeight
    });

    $scope.$watch('posX', function(newPosX) {
        var max = $scope.scrollableConfig.customContentWidth - _containerWidth;
        $scope.red = Math.round(newPosX / max * 255);
        $scope.updateColor();
    });


    $scope.$watch('posY', function(newPosY) {
        var max = $scope.scrollableConfig.customContentHeight - _containerHeight;
        $scope.green = Math.round(newPosY / max * 255);
        $scope.updateColor();
    });


    $scope.updateColor = function() {
        $scope.demoStyle.backgroundColor =
            'rgb(' + $scope.red + ', ' + $scope.green + ', 255)'
    };

    $scope.demoStyle = {
        backgroundColor: 'rgb(0,0,255)'
    }
});
