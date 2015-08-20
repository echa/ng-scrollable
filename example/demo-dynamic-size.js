var app = angular.module('app', ['ngScrollable']);

app.controller('Demo', function ($scope, $interval) {
    'use strict';

    $scope.posX = 0;
    $scope.posY = 0;

    $scope.red = 0;
    $scope.green = 0;

    $scope.customContentWidth = 2000;
    $scope.customContentHeight = 1000;

    $scope.scrollableConfig = {
        updateContentPosition: false
    };

    var dirWidth = 100;
    var dirHeight = 100;

    var _containerWidth = 0;
    var _containerHeight = 0;

    $scope.$on('scrollable.dimensions', function(event, containerWidth, containerHeight, contentWidth, contentHeight, id) {
        _containerWidth = containerWidth;
        _containerHeight = containerHeight
    });

    $interval(function() {
        if ($scope.customContentWidth > 4000 || $scope.customContentWidth < 1000) dirWidth *= -1;
        $scope.customContentWidth += dirWidth;

        if ($scope.customContentHeight > 2000 || $scope.customContentHeight < 500) dirHeight *= -1;
        $scope.customContentHeight += dirHeight;

        console.log($scope.customContentWidth + ", " + $scope.customContentHeight);
    }, 500, 200);



    $scope.$watch('posX', function(newPosX) {
        var max = $scope.customContentWidth - _containerWidth;
        $scope.red = Math.round(newPosX / max * 255);
        $scope.updateColor();
    });


    $scope.$watch('posY', function(newPosY) {
        var max = $scope.customContentHeight - _containerHeight;
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
