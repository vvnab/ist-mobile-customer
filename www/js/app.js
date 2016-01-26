// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var DEBUG = false;
var API_URL = DEBUG ? "http://192.168.100.159:8015/v1" : "http://api.taxi21.ru/v1";
var API_KEY = "SbzLONyITCNZ5U98tESyyvzvRQU0Ivwo7IyoKgqKQr2AaST1yNC496We4lezLgQF";
var SEARCH_MIN_LENGTH = 3;
var NEED_HSE = [0, 1, 9];
var DELTA_COST = 5;
var AUTO_FOCUS_DELAY = 1000;
var MINCOST_K = 0.5;
var ORDER_UPDATE_DURATION = 10 * 1000;
var ARC_ORDERS_UPDATE_DURATION = DEBUG ? 15 * 1000 : 5 * 60 * 1000;
var CUR_ORDERS_UPDATE_DURATION = DEBUG ? 5 * 1000 : 30 * 1000;
var HTTP_TIMEOUT = 15 * 1000;
var TOAST_DELAY = 5 * 1000;
var SMS_PIN = true;
var ENTER_KEYCODES = [13, 84];
var DAYS_FOR_ADVANCE_ORDER = 5;
var ORDER_STATES_FOR_NOTIFY = [2, 3];
var ORDER_STATE_AUDIO_NOTIFY_URL = "sound/addorder.ogg";
var TARIFF_ICONS = {
  1: "flaticon-pig",
  2: "flaticon-set5",
  3: "",
  4: "icon-vip",
  5: ""
};

var OPTION_ICONS = {
  "smoke":        "flaticon flaticon-smoke3", //"ion-ios-cloud",
  "notsmdrv":     "flaticon flaticon-smoke", //"ion-no-smoking",
  "bagage":       "flaticon flaticon-luggage17", //"ion-briefcase",
  "roofbag":      "ion-bag",
  "child":        "flaticon flaticon-bears1", //"ion-ios-body",
  "animal":       "flaticon flaticon-dog50", //"ion-social-github",
  "note":         "ion-cash",
  "conditioner":  "flaticon flaticon-snow42", //"ion-ios-snowy",
  "noshanson":    "flaticon flaticon-no55", //"ion-volume-mute",
  "cheque":       "ion-clipboard",
  "gntldrving":   "ion-social-github",
  "silentdrv":    "ion-volume-mute"
};

var TWN_ID_DEFAULT = 181;
var AVERAGE_SPEED = 40; // средняя скорость в км/ч
var SAMPLE_ADDS = [
  {
    twn_id: 3,
    type: 2,
    adr: "ЦУМ ТЦ (Интернациональная ул. 147)",
    hse: "",
    ent: ""
  },
  {
    twn_id: 3,
    type: 9,
    adr: "Советская",
    hse: "88",
    ent: ""
  }
];
var NO_WTD_COST_ERR_MSG = "Данные недоступны";
var SPLASHSCREEN_TIMEOUT = 1000;
var ADDR_BY_VOICE = "Объясню водителю";
var OPERATOR_PHONE = "+78212242424";

function declOfNum(number, titles) {
  // русские окончания числительных [1, 2..4, 5..0]
  cases = [2, 0, 1, 1, 1, 2];
  return titles[ (number%100>4 && number%100<20)? 2 : cases[(number%10<5)?number%10:5] ];
}

function humanizeDuration(duration) {
  var hours = duration.hours();
  var minutes = duration.minutes();
  if (hours && minutes) {
    return "{0} {1} {2} {3}".format(hours, declOfNum(hours, ["час", "часа", "часов"]), minutes, declOfNum(minutes, ["минута", "минуты", "минут"]));
  } else if (hours) {
    return "{0} {1}".format(hours, declOfNum(hours, ["час", "часа", "часов"]));
  } else {
    return "{0} {1}".format(minutes, declOfNum(minutes, ["минута", "минуты", "минут"]));
  }

}

try {
  moment.locale("ru-RU");
} catch(err) {}

angular.module('app', ['ionic', 'app.controllers', 'app.directives', 'app.providers'])

.run(function($ionicPlatform, $state, toast, mediaSrv) {
  $ionicPlatform.ready(function() {
    // check onLine
    document.addEventListener("offline", function() {
      $state.go("error", {
        title: "Нет соединения",
        text: "Отсутствует подключение к интернету!",
        icon: "ion-flash-off"
      });
    });
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    // console.log('window.cordova.plugins:' + JSON.stringify(window.cordova.plugins));
    // console.log('window.plugins:' + JSON.stringify(window.plugins));
    if(window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
    ionic.Platform.isFullScreen = true;
    document.addEventListener("backbutton", function() {
      if ($state.is("app.main") || $state.is("error")) {
        navigator.app.exitApp();
      };
    }, false);
  });
})
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('login', {
      url: "/login",
      templateUrl: "templates/login.html",
      controller: 'LoginCtrl',
    })
    .state('townSelect', {
      url: "/townSelect",
      cache: false,
      templateUrl: "templates/townSelect.html",
      controller: 'TownSelectCtrl',
      onEnter: function() {
        if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
      }
    })
    .state('error', {
      url: "/error",
      params: {
        title: "Ошибка",
        text: "Неизвестная ошибка",
        next: "app.main",
        eventForNext: "online",
        icon: "ion-bug"
      },
      templateUrl: "templates/error.html",
      controller: 'ErrorCtrl',
      onEnter: function() {
        if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
      }
    })
    .state("app", {
      url: "",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: "AppCtrl",
      onEnter: function() {
        if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
      },
      resolve: {
        login: function($state, $q, $localStorage, $window, app, user, userRes, locationRes, toast) {
          var def = $q.defer();
          // проверка логина пользователя
          if (!app.logged) {
            userRes.get().$promise.then(function(res) {
              $localStorage.userProfile = res;
              app.logged = true;
              user.profile = $localStorage.userProfile;
              app.twns_.$promise.then(function(res) {
                app.getTwn().then(function(twn) {
                  if (!twn) {
                    if (!app.twn_id) {
                      $state.go("townSelect");
                    } else {
                      def.resolve();
                    }
                  } else {
                    if (!app.twn_id) {
                      app.twn_id = twn.id;
                      $localStorage.twn_id = twn.id;
                      def.resolve();
                    } else if (twn.id != app.twn_id) {
                      $state.go("townSelect");
                      toast("Вы сейчас в г.{0}, \nне хотите переключиться?".format(twn.nme));
                    } else {
                      def.resolve();
                    }
                  }
                }, function(error) {
                  $state.go("townSelect");
                });
              });
            }, function(error) {
              $state.go("login");
            }).finally(function() {});
          } else {
            def.resolve();
          }
          return def.promise;
        }
      }
    })
    .state('app.main', {
      url: "/main",
      onEnter: function($ionicNavBarDelegate, $rootScope) {
        if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
        $rootScope.showTel = true;
        $ionicNavBarDelegate.showBackButton(false);
      },
      onExit: function($ionicNavBarDelegate, $rootScope) {
        $rootScope.showTel = false;
        $ionicNavBarDelegate.showBackButton(true);
      },
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/main.html",
          controller: 'MainCtrl'
        }
      }
    })
    .state('app.addr', {
      url: "/addr/:id",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/addrSelect.html",
          controller: 'AddrCtrl'
        }
      }
    })
    .state('app.addrEdit', {
      url: "/addr/edit/:id",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/addrEdit.html",
          controller: 'AddrEditCtrl'
        }
      }
    })
    .state('app.addrHistory', {
      url: "/addr/:id/select/history",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/addrHistory.html",
          controller: 'AddrHistoryCtrl'
        }
      }
    })
    .state('app.addrFavotites', {
      url: "/addr/:id/select/favorites",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/addrFavorites.html",
          controller: 'AddrFavotitesCtrl'
        }
      }
    })
    .state('app.addrSelect', {
      url: "/addr/select/:type",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/addrSelect.html",
          controller: 'AddrCtrl'
        }
      }
    })
    .state('app.orderAdvance', {
      url: "/order/advance",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/orderAdvance.html",
          controller: 'OrderAdvanceCtrl'
        }
      }
    })
    .state('app.orderState', {
      url: "/order/:id",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/orderState.html",
          controller: 'OrderCtrl'
        }
      },
      onExit: function(user, $interval) {
        $interval.cancel(user.orderInterval);
      }
    })
    .state('app.orderHistory', {
      url: "/history",
      cache: false,
      views: {
        "menuContent": {
          templateUrl: "templates/orderHistory.html",
          controller: 'HistoryCtrl'
        }
      },
      onExit: function(user, $interval) {
        $interval.cancel(user.orderInterval);
      }
    });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/main');

})
.config(["$httpProvider", function($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.timeout = HTTP_TIMEOUT;
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.headers.common.Apikey = API_KEY;
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
}])
.config(["$resourceProvider", function($resourceProvider) {
    $resourceProvider.defaults.stripTrailingSlashes = false;
    $resourceProvider.defaults.timeout = HTTP_TIMEOUT;
}])
.config(["$ionicConfigProvider", function($ionicConfigProvider) {
  $ionicConfigProvider.views.transition("none");
  $ionicConfigProvider.views.maxCache(10);
  $ionicConfigProvider.views.forwardCache(true);
}])
.config(["toastProvider", function(toastProvider) {
    toastProvider.timeout = TOAST_DELAY;
}]);
