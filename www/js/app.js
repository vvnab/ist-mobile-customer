// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'

var DEBUG = true;
var DEBUG = false;
var API_PING_INTERVAL = 3000;
var GEOLOCATION_TIMEOUT = 5000;
var GEOLOCATION_ACCURACY = 100;
var GEOLOCATION_ADDS_QUANTITY = 3;
var ARC_ORDERS_WEEKS = 52;
var ARC_ORDERS_LIMIT = 10;
var API_URL = DEBUG ? "http://192.168.100.159:8015/v1" : "http://api.taxi21.ru/v1";
var API3_URL = DEBUG ? "http://taxi-dev01.taxi21.ru:8001" : "http://api.customer.taxi21.ru";
var API_KEY = "SbzLONyITCNZ5U98tESyyvzvRQU0Ivwo7IyoKgqKQr2AaST1yNC496We4lezLgQF";
var SEARCH_MIN_LENGTH = 3;
var SEARCH_ADDS_QUANTITY = 5;
var NEED_HSE = [0, 1, 9];
var DELTA_COST = 5;
var AUTO_FOCUS_DELAY = 1000;
var MINCOST_K = 0.5;
var ORDER_UPDATE_DURATION = 10 * 1000;
var ARC_ORDERS_UPDATE_DURATION = DEBUG ? 15 * 1000 : 1 * 60 * 1000;
var CUR_ORDERS_UPDATE_DURATION = DEBUG ? 5 * 1000 : 30 * 1000;
var HTTP_TIMEOUT = 15 * 1000;
var TOAST_DELAY = 5 * 1000;
var SMS_PIN = true;
var ENTER_KEYCODES = [13, 84];
var DAYS_FOR_ADVANCE_ORDER = 5;
var ORDER_STATES_FOR_NOTIFY = [2, 3];
var ORDER_STATE_AUDIO_NOTIFY_URL = "sound/addorder.ogg";
var YANDEX_APP_METRIKA_ID = '140660';
var YANDEX_APP_METRIKA_KEY = '62bb12e2-5352-45f2-9bec-10e370c1a780';
var BACK_BUTTON_COUNT = 0;
var BACK_BUTTON_COUNT_TIMEOUT = 1 * 1000; // 1 sekond
var HISTORY_ORDER_REMOVE_TIMEOUT = 2 * 1000;
var TARIFF_ICONS = {
  1: "flaticon-pig",
  2: "flaticon-set5",
  3: "",
  4: "icon-vip",
  5: ""
};

var OPTION_ICONS = {
  "smoke": "flaticon flaticon-smoke3", //"ion-ios-cloud",
  "nosmoke": "flaticon flaticon-smoke", //"ion-no-smoking",
  "bag": "flaticon flaticon-luggage17", //"ion-briefcase",
  "largeBag": "ion-bag",
  "babyFix": "flaticon flaticon-bears1", //"ion-ios-body",
  "pet": "flaticon flaticon-dog50", //"ion-social-github",
  "cash5000": "ion-cash",
  "cash1000": "ion-cash",
  "conditioner": "flaticon flaticon-snow42", //"ion-ios-snowy",
  "noshanson": "flaticon flaticon-no55", //"ion-volume-mute",
  "ticket": "ion-clipboard",
  "gntldrving": "ion-social-github",
  "silentdrv": "ion-volume-mute",
  "reservation": "ion-clock"
};

var TWN_ID_DEFAULT = 181;
var AVERAGE_SPEED = 40; // средняя скорость в км/ч
var SAMPLE_ADDS = [{
  twn_id: 3,
  type: 2,
  adr: "ЦУМ ТЦ (Интернациональная ул. 147)",
  hse: "",
  ent: ""
}, {
  twn_id: 3,
  type: 9,
  adr: "Советская",
  hse: "88",
  ent: ""
}];
var NO_WTD_COST_ERR_MSG = "Данные недоступны";
var SPLASHSCREEN_TIMEOUT = 1000;
var ADDR_BY_VOICE = "Объясню водителю";
var OPERATOR_PHONE = "+78212242424";
var SUPPORT_PHONE = "+79042002121";

var MIN_CARD_STAY = 1;
var CARD_EDIT_TIMEOUT = 500;
var CARD_TYPES = {
  '0': {
    title: 'промокод',
    icon: 'ion-pricetag'
  },
  '3': {
    title: 'безналичная',
    icon: 'ion-card'
  },
  '8': {
    title: 'накопительная',
    icon: 'ion-star'
  }
};

var TARIFFS;

function declOfNum(number, titles) {
  // русские окончания числительных [1, 2..4, 5..0]
  cases = [2, 0, 1, 1, 1, 2];
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
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
} catch (err) {}

angular.module('app', ['ionic', 'app.controllers', 'app.directives', 'app.providers'])

.run(function($ionicPlatform, apiRes, $state, $ionicHistory, toast, mediaSrv, app) {
    $ionicPlatform.ready(function() {
      if (window.PushNotification) {
        console.log("PushNotification init...");
        app.push = PushNotification.init({
          android: {
            senderID: "986216252822",
            forceShow: true
          },
          browser: {
            pushServiceURL: 'http://push.api.phonegap.com/v1/push'
          },
          ios: {
            alert: "true",
            badge: "true",
            sound: "true"
          },
          windows: {}
        });

        app.push.on('registration', function(data) {
          console.log("PushNotification register OK");
        });

        app.push.on('notification', function(data) {
          console.warn("PushNotification:", data);
          // data.message,
          // data.title,
          // data.count,
          // data.sound,
          // data.image,
          // data.additionalData
        });
      } else {
        console.error("PushNotification error!");
      }
      // app.deviceready.resolve();
      if (DEBUG) {
        console.info("resolve DEVICE READY");
        app.deviceready.resolve();
      } else {
        document.addEventListener("deviceready", app.deviceready.resolve, false);
        setTimeout(app.deviceready.resolve, 5000);
      }
      if (window.plugins && window.plugins.appMetrica) {
        window.plugins.appMetrica.activate(YANDEX_APP_METRIKA_KEY);
        // toast("Яндекс плагин OK");
      } else {
        // toast("Ошибка Яндекс плагина");
      }
      // check onLine
      document.addEventListener("offline", function() {
        $state.go("error", {
          title: "Нет соединения",
          text: "Отсутствует подключение к интернету!",
          icon: "ion-flash-off"
        });
      });
      // пинг API
      setInterval(function() {
        var onlineEvent = new Event('online');
        var offlineEvent = new Event('offline');
        apiRes.get().$promise.then(function(data) {
          // console.info("online", data);
          document.dispatchEvent(onlineEvent);
        }, function() {
          console.warn("offline");
          document.dispatchEvent(offlineEvent);
        });
      }, API_PING_INTERVAL);
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      // console.log('window.cordova.plugins:' + JSON.stringify(window.cordova.plugins));
      // console.log('window.plugins:' + JSON.stringify(window.plugins));

      if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      }

      if (window.StatusBar) {
        StatusBar.styleDefault();
      }

      // if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();

      ionic.Platform.isFullScreen = true;

      $ionicPlatform.registerBackButtonAction(function(e) {
        if ($state.is("app.main") || $state.is("error")) {
          // выход
          // требуем двойного нажатия
          if (BACK_BUTTON_COUNT >= 1) {
            navigator.app.exitApp();
          } else {
            toast("Для выхода из приложения дважды нажмите кнопку „Назад“");
            BACK_BUTTON_COUNT++;
            // через 1сек сбрасываем BACK_BUTTON_COUNT
            setTimeout(function() {
              BACK_BUTTON_COUNT = 0;
            }, BACK_BUTTON_COUNT_TIMEOUT);
          }
        } else {
          navigator.app.backHistory();
        };
      }, 300);
    });
  })
  .config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('login', {
        url: "/login",
        templateUrl: "templates/login.html",
        controller: 'LoginCtrl',
        onEnter: function() {
          if (window.navigator && navigator.splashscreen) {
            console.info("HIDE SPLASH");
            navigator.splashscreen.hide();
          }
        },
      })
      .state('townSelect', {
        url: "/townSelect",
        cache: false,
        templateUrl: "templates/townSelect.html",
        controller: 'TownSelectCtrl',
        onEnter: function(app) {
          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
          app.card = null;
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
        cache: false,
        onEnter: function() {
          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
        }
      })
      .state("app", {
        url: "",
        abstract: true,
        templateUrl: "templates/menu.html",
        controller: "AppCtrl",
        onEnter: function(geolocationRes, app, Addr) {
          console.info("state: app -> onEnter");
          var n = n || GEOLOCATION_ADDS_QUANTITY;
          var self = this;
          app.coordsDef.promise.then(function() {
            geolocationRes.get({
              lat: app.coords.lat,
              lon: app.coords.lon,
              townId: app.twn_id,
              quantity: n
            }).$promise.then(function(result) {
              app.geolocationAdds = _.map(result, function(item) {
                var addr = new Addr();
                addr.set(item);
                return addr;
              });
            });
          });
        },
        resolve: {
          login: function($state, $q, $localStorage, $window, app, user, userRes, locationRes, $ionicLoading, toast, dataTransform) {
            var def = $q.defer();
            // проверка логина пользователя
            if (!app.logged) {
              userRes.get().$promise.then(function(res) {
                console.info("state: app -> resolve -> login -> userRes");
                res.adds = _.map(res.addresses, dataTransform.addr0);
                // установка промокода
                $localStorage.userProfile = res;
                app.logged = true;
                user.profile = $localStorage.userProfile;
                app._tariffs.$promise.then(function(res) {
                  app.getTwn(3).then(function(twn) {
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
                      //   toast("Ошибка при определении города");
                      app.twn_id = $localStorage.twn_id;
                      if (app.twn_id) {
                        def.resolve();
                      } else {
                        def.reject();
                        $state.go("townSelect");
                      }
                    })
                    .finally(function() {
                      $ionicLoading.hide();
                    });
                });
              }, function(error) {
                console.error(error);
                def.reject();
                $ionicLoading.hide();
                if (error.data) {
                  $state.go("login");
                } else {
                  $state.go("error", {
                    title: "Нет соединения",
                    text: "Отсутствует подключение к интернету!",
                    icon: "ion-flash-off"
                  });
                }

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
        onEnter: function($ionicNavBarDelegate, $rootScope, $localStorage, $ionicLoading, app, user) {

          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();

          $ionicLoading.hide();
          $rootScope.showTel = true;
          $ionicNavBarDelegate.showBackButton(false);
          // установка карты
          if (!app.card) {
            var savedCard = $localStorage.card || {};
            app.card = user.getCard(savedCard.id);
          }
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
      .state('app.orderCards', {
        url: "/order/cards",
        cache: false,
        onExit: function(app, $localStorage) {
          $localStorage.promo = app.promo;
          $localStorage.card = app.card;
        },
        views: {
          "menuContent": {
            templateUrl: "templates/orderCards.html",
            controller: 'OrderCardsCtrl'
          }
        }
      })
      .state('app.orderCard', {
        url: "/order/card/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "templates/orderCardInfo.html",
            controller: 'OrderCardCtrl'
          }
        }
      })
      .state('app.orderPromo', {
        url: "/order/promo",
        onExit: function(app, $localStorage) {
          $localStorage.promo = app.promo;
          $localStorage.card = app.card;
        },
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "templates/orderPromo.html",
            controller: 'OrderPromoCtrl'
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
