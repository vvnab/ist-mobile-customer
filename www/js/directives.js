angular.module('app.directives', [])

.directive('inputMask', function() {
	return {
    link: function(scope, element, attrs) {
        $(element).mask('(000) 000 00 00', {placeholder: "(___) _______"});
    }
  }
})
.directive('keyFocus', function() {
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {
      elem.on('keyup', function (e) {
        // up arrow
        if (e.keyCode == 13) {
        	var i = $('[key-focus]', 'body').index($(elem));
        	if(i != -1)
        		$('[key-focus]', 'body').eq(i+1).focus();

          // if(!scope.$last) {
          //   elem[0].nextElementSibling.focus();
          // }
        }
      });
    }
  };
})
.directive("autoFocus", function($timeout) {
    return {
        scope: {trigger: "=autoFocus"},
            link: function(scope, element) {
                scope.$watch("trigger", function(value) {
                if(value) {
                    $timeout(function() {
                        element[0].focus();
                        if (window.cordova && cordova.plugins && cordova.plugins.Keyboard) cordova.plugins.Keyboard.show();
                    }, AUTO_FOCUS_DELAY);
                }
            });
        }
    }
})
.directive('fastClick', [function() {
  return function(scope, element, attr) {
    var fn = function() {
      scope.$apply(function() { 
          scope.$eval(attr.fastClick); 
        });
    }

    scope._usingTouch = true;

    element.on('touchstart', function(event) {
        scope._usingTouch = true;
        fn();
    });

    element.on('mousedown', function(event) {
     if(!scope._usingTouch)
        fn();
    });
  }
}]);
