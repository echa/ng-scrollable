var app = angular.module('app', ['ngScrollable']);

app.controller('Demo', function ($scope) {
    'use strict';

    $scope.posX = 0;
    $scope.posY = 0;

    $scope.red = 0;
    $scope.green = 0;

    $scope.customContentWidth = 2000;
    $scope.customContentHeight = 1000;

    $scope.scrollableConfig = {
        updateContentPosition: false,
        enableKinetic: false
    };

    var _containerWidth = 0;
    var _containerHeight = 0;

    $scope.$on('scrollable.dimensions', function(event, containerWidth, containerHeight, contentWidth, contentHeight, id) {
        _containerWidth = containerWidth;
        _containerHeight = containerHeight
    });

    $scope.$watch('posX', function(newPosX) {
        var max = $scope.customContentWidth - _containerWidth;
        $scope.red = Math.round(newPosX / max * 255);
        $scope.updateColor();
    });


    $scope.$watch('posY', function(newPosY) {
        var max = $scope.customContentHeight - _containerHeight;
        console.log($scope.customContentHeight + ", " + _containerHeight);
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
