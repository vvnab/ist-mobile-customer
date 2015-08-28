angular.module('app.providers', [])
.provider("toast", [
    function() {
    	angular.element(document.body).prepend("<div id='toast-container'></div>");
    	self = this;
    	self.templateUrl = null;
    	self.template = "\
			<div class='{{class}} animate' ng-bind-html='message' ng-click='setHide()' ng-if='show'>\
			</div>\
    	";
    	self.timeout = 0;
        self.$get = [
    		"$timeout", 
    		"$http", 
    		"$compile", 
    		"$templateCache", 
    		"$rootScope",
    		"$sce",
    		"$q",
    		function(
    			$timeout, 
    			$http, 
    			$compile, 
    			$templateCache, 
    			$rootScope, 
    			$sce, 
    			$q
    		) {
    			var container = document.getElementById('toast-container');
	    		return function(args) {
					if (typeof(args) !== "object") {
				        args = {message: args};
				    }
				    args.templateUrl = args.templateUrl || self.templateUrl;
				    args.timeout = args.timeout || self.timeout;

				    var scope = $rootScope.$new();
				    scope.message = $sce.trustAsHtml(args.message);
				    scope.class = args.class || "toast-text";
				    
				    scope.setHide = function() {
				    	scope.show = false;
				    }
				    
					if (window.plugins && window.plugins.toast) {
						//console.log("TOAST native");
						window.plugins.toast.showLongTop(args.message);
					} else {
						//console.log("TOAST NOT native");
					    if (args.timeout) {
					    	$timeout(function() {
					    		scope.show = false;
					    	}, args.timeout);
					    }

					    var def = $q.defer();

					    if (args.templateUrl) {
				    	    $http.get(args.templateUrl, {cache: $templateCache})
				    		    .then(function(template) {
				    		    	// файл шаблона загружен
				    		    	var templateElement = $compile(template)(scope);
				    		    	def.resolve();
				    		    }, function(err) {
				    		    	// 404 файл шаблона не найден, используем шаблон по умолчанию
				    		    	var templateElement = $compile(self.template)(scope);
				    		    	def.resolve();
				    		    });
				    	} else {
		    		    	// используем шаблон по умолчанию
		    		    	var templateElement = $compile(self.template)(scope);
		    		    	def.resolve();
				    	}

				    	def.promise.then(function(){
				    		angular.element(container).append(templateElement);
				    		scope.show = true;
				    	});
					}
		    	};
    		}
    	];
    	return self;
    }
]);
