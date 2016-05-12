angular.module('app.controllers', ['app.services', 'app.providers', 'ngStorage', 'app.filters'])

.controller('LoginCtrl', function($scope, $state, $ionicLoading, $localStorage, $timeout, pinRes, userRes, app, user, toast, _) {
    if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();

    user.profile = null;
    userRes.delete(function() {
      user.lgn = null;
      console.info("user deleted");
    });

    $scope.user = user;
    $scope.user.smsSended = false;

    $scope.getPin = function(opts) {
      // запрос ПИН кода
      user.error = false;
      $ionicLoading.show();
      var sms = opts ? !!opts.sms : SMS_PIN
      pinRes.save({
        tel: $scope.user.canonicalPhone(),
        sms: sms
      }).$promise.then(function(res) {
        // OK
        console.log(res);
        if (DEBUG) {
          toast(res.detail);
        } else {
          toast(sms ? "Дождитесь SMS с PIN-кодом" : "Дождитесь звонка автоинформатора");
        }
        $scope.user.smsSended = true;
        if (window.SMS) {
          SMS.startWatch(null, null);
          //     	toast("SMS Ok");
          window.document.addEventListener("onSMSArrive", function(e) {
            var sms = e.data ? e.data.body : "";
            if (sms.match(/PIN/)) {
              SMS.stopWatch(null, null);
              var pin = _.first(sms.match(/\d{4}/g)) || "";
              $scope.user.pin = pin;
              $scope.doLogin();
            }
          });
        }
      }, function(err) {
        //  ERROR
        console.error(err);
      }).finally(function() {
        $ionicLoading.hide();
      });
    };
    $scope.doLogin = function() {
      // вход пользователя
      user.error = false;
      $ionicLoading.show();
      userRes.save({
        lgn: $scope.user.canonicalPhone(),
        pwd: $scope.user.pin
      }).$promise.then(function(res) {
        $localStorage.userProfile = res;
        user.profile = $localStorage.userProfile;
        $localStorage.card = null;
        app.card = $localStorage.card;
        loginOk();
      }, function(err) {
        //  ERROR
        user.error = "Неверный логин/пароль";
        $ionicLoading.hide();
        toast(user.error);
        console.error(err);
      }).finally(function() {
        user.pin = "";
        // $ionicLoading.hide();
      });
    };

    var loginOk = function() {
      $state.go("app.main", null, {
        reload: true
      });
    }
  })
  .controller('AppCtrl', function($scope, $rootScope, $state, $ionicLoading, $timeout, $localStorage, toast, pinRes, geolocationRes, userRes, orderRes, Order, user, app) {
    $timeout(function() {
      if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();
      toast("Здравствуйте, " + (user.profile.name.value || user.profile.lgn));
    }, SPLASHSCREEN_TIMEOUT);
    user.order = user.order ? user.order : user.newOrder();
    user.profile = $localStorage.userProfile || {};
    user.historyUpdate().then(function() {
      if (user.curOrders.length > 0) $state.go("app.orderState", {
        id: _.first(user.curOrders).id
      });
    });

    user.arcAddsLoad();
    user.periodicHistoryUpdate();
    $scope.user = user;
    $scope.app = app;
    $scope.appVersion = window.AppVersion ? "(v{0})".format(AppVersion.version) : "";
  })
  .controller('MainCtrl', function($scope, $rootScope, $state, $stateParams, $timeout, $ionicLoading, geolocationRes, orderRes, Addr, Order, app, user, _, toast) {

    $scope._ = _;
    $scope.order = user.order;
    $scope.user = user;
    $scope.app = app;

    console.warn(app.card);

    $scope.gotoTwnSelect = function() {
      $state.go('townSelect');
    };

    $scope.state = {
      tel: true,
      urgentShow: user.order.trf && user.order.trf.level == 5,
      urgent: false,
      urgentCost: null,
      urgentTime: null
    };

    app.getTrfs().then(function(res) {
      app.trfs = res;
      $scope.order.trf = $scope.order.trf ? $scope.order.trf.id : _.findWhere(res, {
        default: true
      }).id;
      $scope.state.urgent = Boolean(_.findWhere(res, {
        level: 5
      })) || false;
      if ($scope.state.urgent) {
        $scope.state.urgentCost = _.findWhere(res, {
          level: 5
        }).mincost;
        $scope.state.urgentTime = _.findWhere(res, {
          level: 5
        }).time;
      }
      user.order.getCost();
    });

    $scope.trfChange = function(id) {
      user.order.trf = id;
      setActiveOptions();
      user.order.getCost();
    };

    $scope.toggleUrgentShow = function() {
      var urgentTrfId = _.findWhere(app.trfs, {
        level: 5
      }).id;
      if (!urgentTrfId) return;
      console.log("toggleUrgentShow");
      $scope.state.urgentShow = !$scope.state.urgentShow;
      if ($scope.state.urgentShow) {
        // срочный заказ, устанавливаем тариф и тип заказа
        $scope.state.order_trf = $scope.order.trf.id;
        $scope.state.order_type = $scope.order.type;
        $scope.order.trf = urgentTrfId;
        $scope.order.type = 0;
        user.order.getCost();
      } else {
        $scope.order.trf = $scope.state.order_trf || _.findWhere(app.trfs, {
          default: true
        }).id;
        $scope.order.type = $scope.state.order_type || 0;
        user.order.getCost();
        setActiveOptions();
      }
    };

    $scope.addrAdd = function() {
      $state.go("app.addr", {
        id: user.order.adds.length
      });
    };

    $scope.addrEdit = function(addr, index) {
      if (addr.type) {
        $state.go("app.addrEdit", {
          id: index
        });
      } else {
        $state.go("app.addr", {
          id: index
        });
      }
    };

    $scope.orderCreate = function() {
      $ionicLoading.show();
      user.order.create(user.profile.lgn).then(function(res) {
        user.curOrders.push(_.extend(res, user.order));
        app.curOrders = user.curOrders.length;
        user.order.id = parseInt(res.id);
        $state.go("app.orderState", {
          id: res.id
        });
      }, function(err) {
        toast(err.data.detail);
        console.error(err);
      }).finally(function() {
        $ionicLoading.hide();
      });
    };

    $scope.gotoAdvance = function() {
      $state.go("app.orderAdvance")
    };

    $scope.gotoPromo = function() {
      $state.go("app.orderPromo")
    };

    $scope.gotoCards = function() {
      $state.go("app.orderCards")
    };

    $scope.addrRemove = function(i) {
      if (i == 0 || user.order.adds.length == 2) {
        user.order.adds[i] = new Addr();
      } else {
        user.order.adds = _.reject(user.order.adds, function(item, k) {
          return k == i;
        });
      }
      user.order.getCost();
    };

    $scope.activeOptions = [];

    setActiveOptions = function() {
      return app.getOpts(user.order.trf ? user.order.trf.id : null).then(function(opts) {
        return user.order.reduceOptions().then(function(res) {
          $scope.activeOptions = _.filter(opts, function(i) {
            return _.contains(res, i.name);
          });
        });
      });
    };
    setActiveOptions();
  })
  .controller('AddrCtrl', function($scope, $state, $stateParams, $ionicHistory, $http, $timeout, Addr, geolocationRes, user, app) {

    console.warn($ionicHistory.backView() ? $ionicHistory.backView().stateName : null);

    $scope.id = $stateParams.id;

    // =====================================
    // geolocationAdds - срисок ближайших адресов
    // =====================================

    $scope.geolocationAdds = user.geolocationAdds || app.geolocationAdds || [];

    // =====================================
    // Заполнение geolocationAdds
    // =====================================

    $scope.getGeolocation = function(n) {
      n = n || GEOLOCATION_ADDS_QUANTITY;
      var self = this;
      app.coordsDef.promise.then(function() {
        geolocationRes.get({
          lat: app.coords.lat,
          lon: app.coords.lon,
          twn_id: app.twn_id,
          quantity: n
        }).$promise.then(function(result) {
          $scope.geolocationAdds = _.map(result, function(item) {
            var addr = new Addr();
            addr.set(item);
            return addr;
          });
          user.geolocationAdds = $scope.geolocationAdds;
        });
      });
    }

    if ($scope.id == 0) $scope.getGeolocation();

    // =====================================
    // Список избранных адресов
    // =====================================

    $scope.favoriteAdds = [];

    // =====================================
    // Заполнение списока избранных адресов
    // =====================================
    if (user.profile.adds && user.profile.adds.length) {
      $scope.favoriteAdds = _.map(_.where(user.profile.adds.slice(0, GEOLOCATION_ADDS_QUANTITY), {
        twn_id: String(app.twn_id)
      }), Addr);
    }
    // =====================================

    // =====================================
    // Список истории адресов
    // =====================================

    $scope.historyAdds = [];

    // =====================================
    // Заполнение списока истории адресов
    // =====================================

    user.arcAdds.then(function(res) {
      $scope.historyAdds = _.map(res.slice(0, GEOLOCATION_ADDS_QUANTITY), Addr);
    });

    // =====================================

    $scope.sources = [
      // {
      // 	icon: "ion-location",
      // 	name: "На карте",
      // 	href: "map"
      // },
      // {
      // 	icon: "ion-image",
      // 	name: "Места",
      // 	href: "places"
      // },
      {
        icon: "ion-clock",
        name: "История",
        href: "history"
      }, {
        icon: "ion-star",
        name: "Избранные",
        href: "favorites"
      }
    ];

    $scope.search = {
      byVoice: ADDR_BY_VOICE,
      text: "",
      types: {
        "9": "Улица",
        "2": "Место"
      }
    };

    $scope.$watch("search.text", function(res, old) {
      if (res) {
        // улица/место найдены!
        if (res && res.length >= SEARCH_MIN_LENGTH) {
          $scope.search.loading = true;
          $http.get(API_URL + "/Adds/", {
              params: {
                nme: res,
                limit: SEARCH_ADDS_QUANTITY,
                twn_id: app.twn_id
              }
            })
            .success(function(data, status) {
              $scope.search.items = data;
              $scope.search.loading = false;
            })
            .error(function(data, status) {
              $scope.search.loading = false;
              $scope.search.items = [];
              console.error(status, data);
            });
        }
      } else {
        $scope.search.items = [];
      }
    });
    $scope.selectAddr = function(addr) {
      // выбор адреса из выпадающего списка
      var addr = new Addr(addr);
      user.order.adds[$stateParams.id] = addr;
      if ($scope.id != 0 && addr.next() == null) {
        $state.go("app.main");
      } else {
        $state.go("app.addrEdit", {
          id: $stateParams.id
        });
      }
    }
    $scope.gotoSelect = function(i) {
      switch (i.href) {
        case "history":
          $state.go("app.addrHistory", {
            id: $stateParams.id
          });
          break;
        case "favorites":
          $state.go("app.addrFavotites", {
            id: $stateParams.id
          });
          break;
      }
    }
    $scope.byVoice = function() {
      $scope.search.text = ADDR_BY_VOICE;
      $scope.addrComplete();
    }
    $scope.addrComplete = function() {
      user.order.adds[$stateParams.id] = new Addr({
        nme: $scope.search.text || "",
        type: 2,
        twn_id: app.twn_id
      });
      $state.go("app.main");
    }
  })
  .controller('AddrHistoryCtrl', function($scope, $state, $stateParams, app, user, _, Addr) {
    user.arcAdds.then(function(res) {
      $scope.adds = _.map(res, Addr);
    });
    $scope.addrSelect = function(addr) {
      user.order.adds[$stateParams.id] = new Addr(addr);
      $state.go("app.main");
    }
  })
  .controller('AddrFavotitesCtrl', function($scope, $state, $stateParams, app, user, _, Addr) {
    $scope.adds = _.map(_.where(user.profile.adds, {
      twn_id: String(app.twn_id)
    }), Addr);
    $scope.addrSelect = function(addr) {
      user.order.adds[$stateParams.id] = new Addr(addr);
      $state.go("app.main");
    }
  })
  .controller('AddrEditCtrl', function($scope, $state, $stateParams, Addr, Order, user) {
    $scope.addr = user.order.adds[$stateParams.id];
    $scope.saveAddr = function() {
      delete $scope.addr.error;
      user.order.getCost();
      $state.go("app.main");
    };
    $scope.gotoAddrSelect = function() {
      $state.go("app.addr", {
        id: $stateParams.id
      });
    }
  })
  .controller('OrderCtrl', function($scope, $state, $stateParams, $interval, $ionicLoading, orderRes, Addr, Order, user, app) {
    $ionicLoading.show();
    var order = _.findWhere(user.curOrders, {id: $stateParams.id}) || {id: $stateParams.id};
    console.log(order);
    $scope.order = new Order(order);
    console.log($scope.order);
    $scope.order.update(orderRes).then(function(res) {
      $ionicLoading.hide();
      if (res.wtd_cost <= 0) {
        $scope.order.error = NO_WTD_COST_ERR_MSG;
      }
    });
    user.orderInterval = $interval(function() {
      $scope.order.update(orderRes).then(function(res) {
        if (res.state == 5) $state.go("app.orderHistory");
      });
    }, ORDER_UPDATE_DURATION);

    $scope.orderCancel = function() {
      $scope.order.delete(orderRes).then(function() {
        delete $scope.order.id;
        $state.go("app.main");
      });
    };

  })
  .controller('HistoryCtrl', function($scope, $state, $stateParams, $localStorage, toast, user, app, Order, _) {
    //$ionicLoading.show();
    $scope._ = _;
    $scope.orderShowState = function(order) {
      $state.go("app.orderState", {
        id: order.id
      })
    };
    $scope.orderRepeat = function(order) {
      app.twn_id = _.first(order.adds).twn_id;
      user.order = new Order(order);
      $state.go("app.main");
    };
    $scope.orderRemove = function(order) {
      if ($scope.ordId == order.id) {
        var removedOrders = $localStorage.removedOrders || [];
        removedOrders.push(order.id);
        $localStorage.removedOrders = removedOrders;
        toast("Заказ удалён из истории");
      } else {
        toast("Для удаления заказа из истории нажмите ещё раз");
      }
      $scope.ordId = order.id;
      setTimeout(function() {
        $scope.ordId = null;
      }, HISTORY_ORDER_REMOVE_TIMEOUT);
    };
    $scope.user = user;
  })
  .controller('OrderAdvanceCtrl', function($scope, $state, $stateParams, $interval, app, user, moment, _) {

    function round(x, r) {
      return parseInt(x / r) * r + r;
    };

    $scope.order = user.order;
    $scope.opts = [];

    $scope.twn = _.findWhere(app.trfs_, {
      twn_id: app.twn_id
    });

    app.getOpts(user.order.trf ? user.order.trf.id : null).then(function(res) {
      // копия с полного набора опций
      $scope.opts = _.map(res, _.clone);
      console.warn($scope.opts);
      // установка существующих опций
      _.forEach($scope.opts, function(i) {
        if (_.contains(user.order.options, i.name)) i.enabled = true;
      });
    });

    $scope.dates = _.map(_.range(0, DAYS_FOR_ADVANCE_ORDER), function(i) {
      return i == 0 ? "Сегодня" : i == 1 ? "Завтра" : moment().add(i, "days").format("dddd, Do MMMM");
    });

    $scope.now = moment().startOf("day");

    $scope.moment = {
      enabled: user.order.type || false,
      moment: user.order.tme_drv ? moment(user.order.tme_drv) : moment().add(1, "days").add(1, "hours").minute(round(moment().minute(), 5)).startOf("minute"),
      get duration() {
        return moment.duration(this.moment - $scope.now);
      },
      get day() {
        return this.duration.days();
      },
      set day(i) {
        var dx = i - this.duration.days();
        this.moment.add(dx, "days");
        if (!this.checkInterval()) {
          this.moment.hour(moment().hour() + 1).minute(round(moment().minute(), 5));
        }
      },
      get hour() {
        return this.moment.format("HH");
      },
      checkInterval: function() {
        var min = moment().add(1, "hours");
        var max = $scope.now.clone().add(DAYS_FOR_ADVANCE_ORDER, "days");
        return this.moment.isBetween(min, max);
      },
      addHour: function(i) {
        this.moment.add(i, "hours");
        if (!this.checkInterval()) this.moment.add(-i, "hours");
      },
      get minute() {
        return this.moment.format("mm");
      },
      addMinute: function(i) {
        this.moment.add(i, "minutes");
        if (!this.checkInterval()) this.moment.add(-i, "minutes");
      },
      processMinute: function(i) {
        var self = this;
        self.addMinute(i);
        self.interval = $interval(function() {
          self.addMinute(i);
        }, 100);
      },
      processHour: function(i) {
        var self = this;
        self.addHour(i);
        self.interval = $interval(function() {
          self.addHour(i);
        }, 100);
      },
      stopProcess: function(i) {
        $interval.cancel(this.interval);
      },
    };

    $scope.$watch('opts', function(newVal, oldVal) {
      if (!_.isEqual(newVal, oldVal)) {
        var opts = _.pluck(_.where($scope.opts, {
          enabled: true
        }), "name");
        user.order.options = opts;
      }

      $scope.moment.enabled = !!_.findWhere($scope.opts, {
        name: "reservation",
        enabled: true
      });
    }, true);

    $scope.$watch('moment', function(newVal, oldVal) {
      if (!_.isEqual(newVal, oldVal)) {
        user.order.type = $scope.moment.enabled;
        user.order.tme_drv = $scope.moment.moment;
      }
    }, true);

    $scope.orderSetOptions = function() {
      user.order.type = $scope.moment.enabled;
      user.order.tme_drv = $scope.moment.moment;
      user.order.options = _.pluck(_.where($scope.opts, {
        enabled: true
      }), "name");
      $state.go("app.main");
    };

    $scope.toggleOpt = function(opt) {
      console.log(opt);
    }
  })

.controller('OrderCardsCtrl', function($scope, $state, $stateParams, user, app, Order, _, toast) {
  if (!app._dont_show_cadr_edit_toast) {
    toast('Для редактирования карты/промокода нажмите на него дважды');
    app._dont_show_cadr_edit_toast = true;
  }
  $scope.promo = app.promo || {};
  $scope.selectedCard = app.card ? app.card : ($scope.promo.enabled ? 0 : -1);
  $scope._ = _;
  $scope.cards = user.getCards();
  $scope.cardEdit = function(card) {
    clearTimeout($scope.timeout);
    if (card == 0) {
      $state.go("app.orderPromo");
    } else if (card) {
      $state.go("app.orderCard", {
        id: card.id
      });
    } else {
    }
  }
  $scope.cardSelect = function(card) {
    if (card == -1) {
      app.promo.enabled = false;
      app.card = null;
      $state.go("app.main");
      return;
    }
    if (card == 0 && !$scope.promo.text) {
      app.promo.enabled = true;
      $state.go("app.orderPromo");
      return;
    }

    // двойное нажатие

    if ($scope.editSelectedCardId == (_.isObject(card) ? card.id : card)) {
      $scope.cardEdit(card);
      return;
    }

    $scope.selectedCard = card;
    $scope.editSelectedCardId = (card ? card.id : card);

    // выбор карты
    if (card == 0) {
      app.promo.enabled = true;
      app.card = null;
    } else if (card == -1) {
      app.promo.enabled = false;
      app.card = null;
    } else {
      app.promo.enabled = false;
      app.card = card;
    }

    $scope.timeout = setTimeout(function() {
      delete $scope.editSelectedCardId;
      $state.go("app.main");
    }, CARD_EDIT_TIMEOUT);
  }
})

.controller('OrderCardCtrl', function($scope, $state, $stateParams, user, app, Order, _) {
  //$ionicLoading.show();
  $scope._ = _;
  $scope.card = user.getCard($stateParams.id);
  $scope.orderSetCard = function() {
    app.card = $scope.card;
    app.promo.enabled = false;
    $state.go("app.main");
  };
})

.controller('OrderPromoCtrl', function($scope, $state, $stateParams, user, app, Order, _) {
  //$ionicLoading.show();
  $scope._ = _;
  $scope.promo = app.promo || {};
  $scope.orderSetPromo = function() {
    app.promo.enabled = true;
    app.card = null;
    $state.go("app.main");
  };
})

.controller('TownSelectCtrl', function($scope, $state, $stateParams, $localStorage, user, Order, _, app, toast) {
    $scope.app = app;
    $scope.user = user;
    $scope.twnSelect = function(twn) {
      user.order = new Order();
      app.twn_id = twn.id;
      $localStorage.twn_id = twn.id;
      user.arcAddsLoad();
      $state.go("app.main");
    }
  })
  .controller('ErrorCtrl', function($scope, $state, $stateParams, $localStorage, app, $window, toast) {
    if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();
    $scope.app = app;
    $scope.error = $stateParams;
    $scope.next = function() {
      document.removeEventListener($scope.error.eventForNext, $scope.next);
      app.init();
      $state.go($scope.error.next || "app.main");
    }
    $scope.repeat = $scope.next;
    $scope.exit = function() {
      navigator.app.exitApp();
    }
    document.addEventListener($scope.error.eventForNext, $scope.next);
  });
