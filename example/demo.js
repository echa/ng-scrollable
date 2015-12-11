var app = angular.module('app', ['ngScrollable']);

app.controller('Demo', function ($scope) {
	'use strict';

	$scope.posX = 0;
	$scope.posY = 0;

	$scope.moveX = function (pixels) {
		$scope.posX = $scope.posX + pixels;
	};
	$scope.moveY = function (pixels) {
		$scope.posY = $scope.posY + pixels;
	};
	$scope.$evalAsync(function () {
		$scope.$broadcast('content.changed', 1000);
	});

	$scope.center = function () {
		$scope.posX = 600;
		$scope.posY = 410;
	};
});
