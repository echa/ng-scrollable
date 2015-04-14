var app = angular.module('app', ['ngScrollable']);

app.controller('AppCtrl', function ($scope) {
	'use strict';

	$scope.posX = 0;
	$scope.posY = 0;

	$scope.moveX = function (pixels) {
		$scope.posX = $scope.posX + pixels;
	};
	$scope.moveY = function (pixels) {
		$scope.posY = $scope.posY + pixels;
	};
});
