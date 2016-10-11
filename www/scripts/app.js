function Toast() {}

Toast.prototype.show = function (message, duration, position, successCallback, errorCallback) {
  cordova.exec(successCallback, errorCallback, "Toast", "show", [message, duration, position]);
};

Toast.prototype.showShortTop = function (message, successCallback, errorCallback) {
  this.show(message, "short", "top", successCallback, errorCallback);
};

Toast.prototype.showShortCenter = function (message, successCallback, errorCallback) {
  this.show(message, "short", "center", successCallback, errorCallback);
};

Toast.prototype.showShortBottom = function (message, successCallback, errorCallback) {
  this.show(message, "short", "bottom", successCallback, errorCallback);
};

Toast.prototype.showLongTop = function (message, successCallback, errorCallback) {
  this.show(message, "long", "top", successCallback, errorCallback);
};

Toast.prototype.showLongCenter = function (message, successCallback, errorCallback) {
  this.show(message, "long", "center", successCallback, errorCallback);
};

Toast.prototype.showLongBottom = function (message, successCallback, errorCallback) {
  this.show(message, "long", "bottom", successCallback, errorCallback);
};

Toast.install = function () {
  if (!window.plugins) {
    window.plugins = {};
  }

  window.plugins.toast = new Toast();
  console.log("TOAST install");
  return window.plugins.toast;
};

if (window.cordrova) cordova.addConstructor(Toast.install);

angular.module('app.services', ['ngResource', 'app.resources'])

.factory('_', function() {
    return window._; // assumes underscore has already been loaded on the page
  })
  .factory('moment', function() {
    return window.moment; // assumes underscore has already been loaded on the page
  })
  .factory('utils', function() {
    return {
      declOfNum: function(number, titles) {
        // русские окончания числительных [1, 2..4, 5..0]
        var cases = [2, 0, 1, 1, 1, 2];
        return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
      }
    };
  })
  .factory("app", function($state, $localStorage, $ionicHistory, $ionicSideMenuDelegate, $q, dataTransform, tariffsRes, locationRes, _, toast, Config) {

    var app = {
      init: function() {
        app._tariffs = tariffsRes.get();
        // app.twns_ = twnRes.get({
        //   rem: "true"
        // });
        // app.trfs_ = trfRes.get();
        // app.opts_ = optRes.get();
      },
      promo: $localStorage.promo || {
        enabled: false,
        text: ""
      },
      // card: $localStorage.card || null,
      // twns_: twnRes.get({
      //   rem: "true"
      // }),
      deviceready: $q.defer(),
      coordsDef: $q.defer(),
      _tariffs: tariffsRes.get(),
      // trfs_: trfRes.get(),
      // opts_: optRes.get(),
      tel: Config.OPERATOR_PHONE,
      supTel: Config.SUPPORT_PHONE,
      twn_id: $localStorage.twn_id,
      twns: [],
      get twn_nme() {
        var twn = _.findWhere(app.twns, {
          id: app.twn_id
        });
        return twn ? twn.nme : null;
      },
      menu: [{
        title: "Новый заказ",
        icon: "&#xE05E;",
        iconType: "md",
        action: function(user) {
          user.order.reset();
          $ionicSideMenuDelegate.toggleRight();
          $state.go("app.main");
        },
      }, {
        title: "История заказов",
        icon: "history",
        iconType: "md",
        action: function() {
          $ionicSideMenuDelegate.toggleRight();
          $state.go("app.orderHistory");
        },
        badgeClass: "assertive",
        get badge() {
          return app.curOrders;
        }
      }, {
        title: "Звонок оператору",
        icon: "&#xE311;",
        iconType: "md",
        href: function() {
          return "tel:" + app.tel;
        }
      }, {
        title: "Контроль качества",
        icon: "&#xE61D;",
        iconType: "md",
        href: function() {
          return "tel:" + app.supTel;
        }
      }, {
        title: "Смена аккаунта",
        icon: "&#xE853;",
        iconType: "md",
        action: function() {
          $ionicSideMenuDelegate.toggleRight();
          $state.go("login");
        },
      }, {
        get title() {
          return "Выбор города";
          // return app.twn_nme;
        },
        icon: "&#xE7F1;",
        iconType: "md",
        action: function() {
          $ionicSideMenuDelegate.toggleRight();
          $state.go("app.townSelect");
        },
      }],
      getTwn: function(twn_id) {
        console.info("app:  getTwn");
        console.log("navigator.geolocation", navigator.geolocation);
        return $q(function(resolve, reject) {
          app._tariffs.$promise.then(function(res) {
            console.info("app: getTwn -> _tariffs");
            app.twns = _.map(res.towns, dataTransform.town);
            if (twn_id) {
              resolve(_.findWhere(app.twns, {
                id: twn_id
              }));
              return;
            }
            // ================================================
            // геолокация
            // ================================================
            // только после DEVICEDEADY

            app.deviceready.promise.then(function() {
              console.info("app:  getTwn -> _tariffs -> geolocation 2");
              // примерное определение местоположения
              // используется для определения города в котором находится клиент
              setTimeout(app.coordsDef.resolve, Config.GEOLOCATION_TIMEOUT);

              try {
                navigator.geolocation.getCurrentPosition(function(res) {
                  console.info("geolocation OK");
                  console.log(res);
                  app.coordsDef.resolve();
                  app.coords = {
                    lat: res.coords.latitude,
                    lon: res.coords.longitude,
                    accuracy: res.coords.accuracy
                  };
                  locationRes.get({
                    lat: app.coords.lat,
                    lon: app.coords.lon
                  }).$promise.then(
                    function(location) {
                      console.info("locationRes OK");
                      var city = location.address.city || location.address.town;
                      var twn = _.findWhere(app.twns, {
                        nme: city
                      });
                      resolve(twn);
                    }
                  );
                }, function(err) {
                  console.log('Geolocation ERROR: ' + JSON.stringify(err));
                  reject(err);
                }, {
                  maximumAge: 60 * 60 * 1000,
                  timeout: Config.GEOLOCATION_TIMEOUT,
                  enableHighAccuracy: false
                });

                // точное определение местоположения
                // используется для определения адреса

                navigator.geolocation.watchPosition(function(res) {
                  // console.log("watch", res);
                  app.coords = {
                    lat: res.coords.latitude,
                    lon: res.coords.longitude,
                    accuracy: res.coords.accuracy
                  };
                  app.coordsDef.resolve();
                }, function(err) {
                  console.log('Geolocation ERROR: ' + JSON.stringify(err));
                }, {
                  maximumAge: 60 * 60 * 1000,
                  timeout: Config.GEOLOCATION_TIMEOUT,
                  enableHighAccuracy: true
                });

              } catch (err) {
                console.error("navigator.geolocation ERROR");
              }

            });
            // ================================================
          });
        });
      },

      getTrfs: function(twn_id) {
        // возвращает Promise списка тарифов
        var self = this;
        if (!twn_id) {
          twn_id = self.twn_id;
        }
        return $q(function(resolve, reject) {
          self.getTwn(twn_id).then(function(twn) {
            self.twn_id = twn.id;

            // ====================================
            self._tariffs.$promise.then(function(res) {
              res = _.map(res.towns, dataTransform.tariffs);
              var twn = _.findWhere(res, {
                twn_id: app.twn_id
              });
              self.tel = twn ? twn.tel || Config.OPERATOR_PHONE : Config.OPERATOR_PHONE;
              var tariffs = twn ? twn.trfs : null;
              var optionsCost = twn ? twn.optionsCost : null;
              tariffs = _.sortBy(_.map(tariffs, function(i, k) {
                return {
                  id: k + 1,
                  tariffId: i.tariffId,
                  level: i.level,
                  mincost: i.mincost,
                  time: i.time,
                  icon: Config.TARIFF_ICONS[i.level],
                  srv_ids: i.srv_ids,
                  name: i.nme,
                  desc: i.desc,
                  options: i.options,
                  optionsCost: optionsCost,
                  default: i.default || false
                };
              }), 'level');
              resolve(tariffs);
            });

            return;

            // =====================================
            self.trfs_.$promise.then(function(res) {
              var twn = _.findWhere(res, {
                twn_id: app.twn_id
              });
              self.tel = twn ? twn.tel || Config.OPERATOR_PHONE : Config.OPERATOR_PHONE;
              var tariffs = twn ? twn.trfs : null;
              var optionsCost = twn ? twn.optionsCost : null;
              tariffs = _.sortBy(_.map(tariffs, function(i, k) {
                return {
                  id: k + 1,
                  tariffId: i.tariffId,
                  level: i.level,
                  mincost: i.mincost,
                  time: i.time,
                  icon: Config.TARIFF_ICONS[i.level],
                  srv_ids: i.srv_ids,
                  name: i.nme,
                  desc: i.desc,
                  options: i.options,
                  optionsCost: optionsCost,
                  default: i.default || false
                };
              }), 'level');
              resolve(tariffs);
            });
            // ===================================

          });
        });
      },
      getDefaultTrf: function(twn_id) {
        var self = this;
        return self.getTrfs(twn_id || app.twn_id).then(function(res) {
          return _.findWhere(res, {
            default: true
          });
        });
      },
      getDefaultSrv: function() {
        var trf = _.findWhere(app.trfs, {
          default: true
        });
        return trf ? _.first(trf.srv_ids) : null;
      },
      getTrfId: function(order) {
        var tariffId = order.trf ? order.trf.tariffId : undefined;
        if (this.card) {
          var tariffId = this.card.trf_id == 31415 ? tariffId : this.card.trf_id;
        }
        return tariffId;
      },
      getSrvId: function(order) {
        var srv_id = order.srv_id;
        if (this.card) {
          var srv_id = this.card.srv_id || order.srv_id || this.getDefaultSrv() || undefined;
        }
        return srv_id;
      },
      showTrfChoice: function(order) {
        if (this.card) {
          var tariffId = this.card.trf_id == 31415 ? undefined : this.card.trf_id;
          var srv_id = this.card.srv_id || undefined;
          return !(srv_id || tariffId);
        }
        return true;
      },
      getOpts: function(trf_id) {
        // возвращает Promise списка опций

        //FIXME иконки потом на сервере надо будет обновить
        var optionsIcons = {
          "smoke": "ca-ismoke",
          "nosmoke": "ca-nosmoke",
          "bag": "ca-bagage",
          "largeBag": "ca-bheavy",
          "pet": "ca-animals",
          "cash5000": "ca-k5000",
          "noshanson": "ca-noshanson",
          "babyFix": "ca-kreslo",
          "conditioner": "ca-climat",
          "ticket": "ca-ticketw"
        };
        var self = this;
        if (!trf_id) {
          return self.getDefaultTrf().then(function(trf) {
            return self.getOpts(trf.id);
          });
        } else {
          return $q(function(resolve, reject) {
            self.getTrfs().then(function(tariffs) {
              self._tariffs.$promise.then(function(res) {
                var options = res.options;
                var result = _.filter(options, function(i) {
                  return _.contains(_.findWhere(tariffs, {
                    id: trf_id
                  }).options, i.name);
                });

                optionsCost = _.findWhere(tariffs, {
                  id: trf_id
                }).optionsCost;

                _.forEach(result, function(i) {
                  i.icon = Config.OPTION_ICONS[i.name];
                  i.cost = optionsCost ? optionsCost[i.name] || 0 : 0;
                });

                resolve(result);
              });
            });
          });
        }
      }
    };
    app._tariffs.$promise.then(function(res) {
      app.twns = res.towns;
    });
    return app;
  })
  .service("user", function($interval, $localStorage, Addr, Order, orderRes, userRes, arcAddsRes, _, app, $q, Config) {
    return {
      profile: null,
      arcOrders: null,
      curOrders: null,
      twn: null,
      historyUpdateFlag: true,
      ordersDefer: $q.defer(),
      getCards: function() {
        var self = this;
        if (!self.eventOn) {
          document.addEventListener('newCardEvent', function(e) {
            console.warn("newCardEvent");
            self.addCard(e.detail);
          }, false);

          document.addEventListener('setCardEvent', function(e) {
            console.warn("setCardEvent");
            self.setCard(e.detail);
          }, false);

          self.eventOn = true;
        }

        var cards = _.filter(self.profile.cards, function(i) {
          return i.townId ? i.townId == app.twn_id : true;
        });
        // cards = _.filter(cards, function(card) {
        //   return card.type == 3 ? card.bill.stay + card.bill.debt >= Config.MIN_CARD_STAY: true;
        // });
        // =====================================================
        // преобразование карт

        var town = _.find(app._tariffs.towns, {
          townId: app.twn_id
        }) || {};

        cards = _.map(cards, function(i) {
          return {
            id: i.id,
            defaultAccumCard: i.number == town.defaultAccumCard,
            rem: i.remarks,
            num: i.number,
            trf_id: i.tariffId,
            srv_id: i.officeId,
            srv: {
              nme: i.officeTitle
            },
            stay: i.balance,
            type: i.type == "BONUS" ? 8 : (i.type == "DEBET" ? 3 : 2),
            reit: i.reit,
            isPercent: i.isPercent,
            bill: {
              rem: i.bill,
              stay: i.balance,
              clt: {
                name: i.client,
                inn: i.inn
              }
            }
          }
        });
        // =====================================================
        cards = _.filter(cards, function(card) {
          return (card.twn_id ? card.twn_id == app.twn_id : true) && _.contains([3, 8], card.type) && (card.type == 8 ? (card.stay > 0 || card.reit > 0) : true);
        });
        cards = _.map(cards, function(card) {
          if (card.type == 8) {
            if ($localStorage.card && $localStorage.card.id == card.id) {
              card.writeOff = card.stay > Config.MIN_CARD_STAY ? $localStorage.card.writeOff : false;
            }
            card.writeOff = card.writeOff == undefined ? false : card.writeOff;
            card.canWriteOff = card.stay > Config.MIN_CARD_STAY;
            card.canWriteOn = card.reit > 0;
          }
          card.typeMeta = Config.CARD_TYPES[card.type];
          if (card.type == 3) {
            card.entity = card.bill.clt.inn.length == 10;
          }
          card.title = card.type == 3 ? card.bill.clt.name : card.num
          card.balance = card.type == 3 ? card.bill.stay + card.bill.debt : card.stay;
          return card;
        });
        return cards;
      },
      addCard: function(card) {
        var self = this;
        var tel = _.first(self.profile.tels);
        var cards = tel ? tel.cards : [];
        cards.push(self.setCard(card));
      },
      setCard: function(card) {
        console.warn("setCard:", card);
        var self = this;
        var town = _.find(app._tariffs.towns, {
          townId: app.twn_id
        });
        card.defaultAccumCard = card.number == town.defaultAccumCard;
        card.writeOff = true;
        card.title = card.num;
        card.typeMeta = Config.CARD_TYPES[card.type];
        app.promo = {};
        $localStorage.promo = app.promo;
        app.card = card;
        $localStorage.card = app.card;
        return card;
      },
      getCard: function(id) {
        var self = this;
        return _.findWhere(self.getCards(), {
          id: parseInt(id)
        });
      },
      newOrder: function() {
        var order = new Order();
        return order;
      },
      canonicalPhone: function(tel) {
        if (!tel) {
          var tel = this.lgn;
        }
        return tel.replace(/\D/g, "").replace(/^7|^8/, "").slice(0, 10);
      },
      classicPhone: function(tel) {
        tel = "" + this.canonicalPhone(tel);
        return tel.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})/, "+7 ($1) $2-$3-$4");
      },
      get completeLgn() {
        return this.lgn ? this.canonicalPhone(this.lgn).length == 10 : false;
      },
      arcAddsLoad: function() {
        var self = this;
        var defer = $q.defer();
        self.arcAdds = defer.promise;
        self.ordersDefer.promise.then(function(res) {
          var adds = _.map(self.arcOrders, function(i) {
            return i.adds;
          });
          adds = _.flatten(adds);
          adds = _.filter(adds, {
            twn_id: app.twn_id
          });
          adds = _.uniq(adds, false, "adr_id");
          defer.resolve(adds);
        });
        return self.arcAdds;
      },
      historyUpdate: function() {
        var self = this;
        // NEW
        // =====================================================
        return orderRes.query().$promise.then(function(result) {
          // console.log(result)
          self.ordersDefer.resolve(result);
          var orderGroup = _.groupBy(result, function(order) {
            return order.st == 70 ? "arc" : "cur"
          });
          var curOrders = _.map(orderGroup.cur, Order);
          if (self.curOrders && curOrders.length != self.curOrders.length) {
            console.info("curOrders change, reloading user profile...");
            userRes.get().$promise.then(function(res) {
              $localStorage.userProfile = res;
              self.profile = $localStorage.userProfile;
              var curCardId = app.card ? app.card.id : null;
              $localStorage.card = self.getCard(curCardId);
              app.card = $localStorage.card;
              console.info("OK");
            });
          }
          self.curOrders = curOrders;
          self.arcOrders = _.map(orderGroup.arc, Order);
          app.curOrders = self.curOrders.length;
        });
      },
      periodicHistoryUpdate: function() {
        var self = this;
        self.interval = $interval(function() {
          if (self.historyUpdateFlag && !app.askPrice) self.historyUpdate();
        }, Config.ENV.ARC_ORDERS_UPDATE_DURATION);
      }
    }
  })
  .factory("Addr", ["app", "geolocationRes", "_", "Config", function(app, geolocationRes, _, Config) {
    return function(addr) {
      if (!addr) {
        var addr = {};
      }
      return {
        type: parseInt(addr.type) || 0,
        adr_id: addr.adr_id || null,
        adr: addr.adr || addr.nme || "",
        hse: addr.hse || "",
        ent: addr.ent || "",
        twn_id: addr.twn_id || 3,
        srt: 0,
        lat: parseFloat(addr.lat) || null,
        lon: parseFloat(addr.lon) || null,
        value: addr.value || null,
        get typeStr() {
          return this.type == 9 ? "Адрес" : "Место";
        },
        next: function(isFirst) {
          // возвращает статус адреса
          // next - следущий параметр: улица/место - adr, дом - hse, подъезд - ent

          // if (isFirst) {
          if (false) {
            if ((_.contains(Config.NEED_HSE, this.type) && this.adr && this.hse && this.ent) || (!(_.contains(Config.NEED_HSE, this.type)) && this.adr && this.ent)) {
              return null;
            } else if ((_.contains(Config.NEED_HSE, this.type) && this.adr && this.hse) || (!(_.contains(Config.NEED_HSE, this.type)) && this.adr)) {
              return "ent";
            } else if (_.contains(Config.NEED_HSE, this.type) && this.adr) {
              return "hse";
            } else {
              return "adr";
            }
          } else {
            if ((_.contains(Config.NEED_HSE, this.type) && this.adr && this.hse) || (!(_.contains(Config.NEED_HSE, this.type)) && this.adr)) {
              return null;
            } else if (_.contains(Config.NEED_HSE, this.type) && this.adr) {
              return "hse";
            } else {
              return "adr";
            }
          }
        },
        text: function(isFirst) {
          // возвращает строку адреса
          var adr = this.adr ? this.adr.replace(/\(.*/, '') : "";
          var hse = this.hse;
          var ent = this.ent;
          var txt = "";
          switch (this.next(isFirst)) {
            case "adr":
              txt = isFirst ? "ОТКУДА ПОЕДЕМ" : "КУДА ПОЕДЕМ";
              break;
            case "ent":
              txt = _.contains(Config.NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr);
              break;
            case "hse":
              txt = "{0}".format(adr);
              break;
            default:
              txt = false ? (_.contains(Config.NEED_HSE, this.type) ? "{0} {1} ({2})".format(adr, hse, ent) : "{0} ({1})".format(adr, ent)) : (_.contains(Config.NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr));
          }
          return this.value ? "{0} <small>({1})</small>".format(this.value, txt) : txt;
        },
        header: function() {
          var adr = this.adr ? this.adr.replace(/\(.*\)/, '') : "";
          var hse = this.hse;
          var ent = this.ent;
          return _.contains(Config.NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr);
        },
        entrance: function() {
          return this.ent.search(/\D+/) + 1 ? this.ent : "{0}-й подъезд".format(this.ent);
        },
        set: function(addr) {
          var self = this;
          self.id = addr.id;
          self.type = addr.type;
          self.twn_id = addr.twn_id;
          self.stt = addr.stt;
          self.hse = addr.hse;
          self.adr = addr.stt;
          self.lat = addr.lat;
          self.lon = addr.lon;
        },
        geolocation: function() {
          var self = this;
          app.coordsDef.promise.then(function() {
            geolocationRes.get({
              lat: app.coords.lat,
              lon: app.coords.lon,
              twn_id: app.twn_id
            }).$promise.then(function(result) {
              if (result.length) {
                var addr = result[0];
                self.set(addr);
              }
            });
          });
        }
      };
    };
  }]);

angular.module('app.resources', ['ngResource'])

.factory('mediaSrv', function(Config, $q, $ionicPlatform, $window) {
    var service = {
      loadMedia: loadMedia,
      getStatusMessage: getStatusMessage,
      getErrorMessage: getErrorMessage
    };

    function loadMedia(src, onError, onStatus, onStop) {
      var defer = $q.defer();
      $ionicPlatform.ready(function() {
        var mediaSuccess = function() {
          if (onStop) {
            onStop();
          }
        };
        var mediaError = function(err) {
          _logError(src, err);
          if (onError) {
            onError(err);
          }
        };
        var mediaStatus = function(status) {
          if (onStatus) {
            onStatus(status);
          }
        };

        if ($ionicPlatform.is('android')) {
          src = '/android_asset/www/main/assets/' + src;
          console.log('Sound src',src);
        }
        defer.resolve(new $window.Media(src, mediaSuccess, mediaError, mediaStatus));
      });
      return defer.promise;
    }

    function _logError(src, err) {
      console.error('media error', {
        code: err.code,
        message: getErrorMessage(err.code)
      });
    }

    function getStatusMessage(status) {
      if (status === 0) {
        return 'Media.MEDIA_NONE';
      } else if (status === 1) {
        return 'Media.MEDIA_STARTING';
      } else if (status === 2) {
        return 'Media.MEDIA_RUNNING';
      } else if (status === 3) {
        return 'Media.MEDIA_PAUSED';
      } else if (status === 4) {
        return 'Media.MEDIA_STOPPED';
      } else {
        return 'Unknown status <' + status + '>';
      }
    }

    function getErrorMessage(code) {
      if (code === 1) {
        return 'MediaError.MEDIA_ERR_ABORTED';
      } else if (code === 2) {
        return 'MediaError.MEDIA_ERR_NETWORK';
      } else if (code === 3) {
        return 'MediaError.MEDIA_ERR_DECODE';
      } else if (code === 4) {
        return 'MediaError.MEDIA_ERR_NONE_SUPPORTED';
      } else {
        return 'Unknown code <' + code + '>';
      }
    }

    return service;
  })
  .factory("authRes", function($resource, $q, toast, Config) {
    return $resource(Config.ENV.API3_URL + "/auth/", null, {
      get: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT
      }
    });
  })
  .factory("userRes", function($resource, $q, toast, Config) {
    return $resource(Config.ENV.API3_URL + "/user/", null, {
      get: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        interceptor: {
          responseError: function(resp) {
            toast("Вход не выполнен");
            return $q.reject(resp);
          }
        }
      }
    });
  })
  .factory("pinRes", function($resource, dataTransform, Config) {
    return $resource(Config.ENV.API3_URL + "/auth/pin/", null, {
      save: {
        method: "POST",
        timeout: Config.HTTP_TIMEOUT,
        transformRequest: function(data) {
          data = dataTransform.pin(data);
          data = JSON.stringify(data);
          return data;
        },
        transformResponse: function(data) {
          data = JSON.parse(data);
          return data;
        }
      }
    });
  })
  .factory("tariffsRes", function($resource, Config) {
    return $resource(Config.ENV.API3_URL + "/tariffs/", null, {
      get: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        isArray: false
      }
    });
  })
  .factory("costRes", function($resource, dataTransform, Config) {
    return $resource(Config.ENV.API3_URL + "/orders/rater/", null, {
      get: {
        method: "POST",
        timeout: Config.HTTP_TIMEOUT,
        transformRequest: function(data) {
          data = dataTransform.rater(data);
          data = JSON.stringify(data);
          return data;
        },
        transformResponse: function(data) {
          data = JSON.parse(data);
          data = dataTransform.raterReverse(data);
          return data;
        }
      }
    });
  })
  .factory("orderRes", function($resource, $localStorage, dataTransform, Config) {
    return $resource(Config.ENV.API3_URL + "/orders/:id/", {
      id: "@id",
    }, {
      query: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        isArray: true,
        params: {
          limit: Config.ARC_ORDERS_LIMIT + ($localStorage.removedOrders ? $localStorage.removedOrders.length : 0)
        },
        transformResponse: function(data) {
          data = JSON.parse(data);
          return _.map(data, dataTransform.order);
        }
      },
      getOne: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        transformResponse: function(data) {
          data = JSON.parse(data);
          console.warn("ORIGINAL", data);
          data = dataTransform.orderOne(data);
          console.warn("TRANSFORMED", data);
          return data;
        }
      },
      crewCall: {
        url:Config.ENV.API3_URL + "/orders/:id/call",
        method: "POST",
        timeout: Config.HTTP_TIMEOUT,
      },
      save: {
        method: "POST",
        timeout: Config.HTTP_TIMEOUT,
        transformRequest: function(data) {
          data = dataTransform.orderReverse(data);
          data = JSON.stringify(data);
          return data;
        }
      }
    });
  })
  .factory("arcAddsRes", function($resource, Config) {
    return $resource(Config.ENV.API_URL + "/AddsHistory/", {
      weeks: Config.ARC_ORDERS_WEEKS
    });
  })
  .factory("addsRes", function($resource, dataTransform, Config) {
    return $resource(Config.ENV.API3_URL + "/addresses/search/", {
      limit: Config.SEARCH_ADDS_QUANTITY
    }, {
      query: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        isArray: true,
        transformResponse: function(data) {
          data = JSON.parse(data);
          data = _.map(data, dataTransform.addr);
          return data;
        }
      }
    });
  })
  .factory("locationRes", function($resource, Config) {
    return $resource(Config.ENV.API3_URL + "/addresses/location");
  })
  .factory("geolocationRes", function($resource, dataTransform, Config) {
    return $resource(Config.ENV.API3_URL + "/addresses/reverseGeolocation/", {
      distance: Config.GEOLOCATION_ACCURACY
    }, {
      get: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        isArray: true,
        transformResponse: function(data) {
          data = JSON.parse(data);
          data = _.map(data, dataTransform.addr0);
          // console.log(data);
          return data;
        }
      }
    });
  })
  .factory("apiRes", function($resource, Config) {
    return $resource(Config.ENV.API3_URL + "/v1/", null, {
      get: {
        method: "GET",
        timeout: Config.HTTP_TIMEOUT,
        isArray: false
      }
    });
  });

'use strict';

angular.module('app.providers', [])
  .provider("toast", [
    function() {
      angular.element(document.body).prepend("<div id='toast-container'></div>");
      var self = this;
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
          var prev_toast = null;
          return function(args) {
            if (typeof(args) !== "object") {
              args = {
                message: args
              };
            }
            args.templateUrl = args.templateUrl || self.templateUrl;
            args.timeout = args.timeout || self.timeout;
            //закрываем прошлую всплывашку
            if (prev_toast) {
              prev_toast.show = false;
            }
            var scope = $rootScope.$new();
            prev_toast = scope;
            scope.message = $sce.trustAsHtml(args.message);
            scope.class = args.class || "toast-text";

            scope.setHide = function() {
              scope.show = false;
            }

            //FIXME пока откажемся от нативного уведомления
            if (false && window.plugins && window.plugins.toast) {
              //console.log("TOAST native");
              window.plugins.toast.showLongBottom(args.message);
            } else {
                //console.log("TOAST NOT native");
              if (args.timeout) {
                $timeout(function() {
                  scope.show = false;
                }, args.timeout);
              }

              var def = $q.defer();

              if (args.templateUrl) {
                $http.get(args.templateUrl, {
                    cache: $templateCache
                  })
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
              // return console.log(args)

              def.promise.then(function() {
                // console.log(angular.element(container));
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

(function() {
  'use strict';
  angular
    .module('app.services')
    .factory("Order", Order);


  function Order($q, _, moment, app, Addr, costRes, orderRes, toast, mediaSrv, $localStorage, Config) {
    return function(order) {
      order = order || {};
      return {
        states: {
          0: "search",
          1: "found",
          2: "en route",
          3: "arrived",
          4: "cancel",
          5: "complete",
          6: "in car",
          7: "delivered",
          8: "advance"
        },
        opr_id: 4142,
        source: "APPLICATION",
        usePromo: true,
        id: order.id,
        type: 0,
        state:order.state,
        st:order.st,
        cost: order.cost || null,
        optionsSum: order.optionsSum || null,
        tme_reg: order.tme_reg || null,
        tme_wtd: order.tme_wtd || null,
        tme_exe: order.tme_exe || null,
        tme_brd: order.tme_brd || null,
        tme_drv: order.tme_drv || null,
        createdAt: order.createdAt,
        get track() {
          return this.id +
                this.state +
                this.adds.map(function(a) { return a.lon + a.lon; }).join('') +
                (this.cost || this.wtd_cost);
        },
        get createdDate() {
          return this.createdAt ? moment(this.createdAt).format("DD.MM.YYYY") : null;
        },
        get createdTime() {
          return this.createdAt ? moment(this.createdAt).format("HH:mm") : null
        },
        wtd_cost: order.wtd_cost || null,
        options: order.options || [],
        dist_km: order.dist_km || 0,
        adds: order.adds ? _.map(order.adds, function(addr) {
          return new Addr(addr);
        }) : [new Addr(), new Addr()],
        get complete() {
          return _.reduce(this.adds, function(s, i, k) {
            return s && !i.next(k == 0);
          }, true) && this.adds.length >= 2;
        },
        get canAdd() {
          return this.adds.length ? _.reduce(this.adds, function(s, i, k) {
            return s && !i.next(k == 0);
          }, true) : false;
        },
        get auto_color() {
          return this.auto && this.auto.split(" ").length ? this.auto.split(" ")[0] : "";
        },
        get auto_model() {
          return this.auto ? this.auto.split(" ").slice(1).join(" ") : "";
        },
        reset: function() {
          this.adds = [new Addr(), new Addr()];
          this.cost = null;
          this.type = 0;
          this.usePromo = true;
          this.options = [];
          // this.tme_reg = null;
          // this.tme_wtd = null;
          // this.tme_exe = null;
          // this.tme_brd = null;
        },
        swapAdds: function(index) {
          var swap = this.adds[index];

          if (index == 1 && swap.adr == Config.ADDR_BY_VOICE) return;

          this.adds[index] = this.adds[index - 1];
          this.adds[index - 1] = swap;
          this.getCost();
        },
        isArchive: function() {
          return this.st == 70
        },
        canCancel: function() {
          return _.contains(["search", "found", "en route", "arrived", "advance"], this.states[this.state] || 0);
        },
        getOrderTme: function() {
          var localTime = moment(this.tme_reg) + parseInt(this.tme_reg_period) * 1000;
          // console.log(moment(this.tme_reg), this.tme_reg_period, localTime);
          var duration = moment.duration(localTime - moment(this.tme_brd || this.tme_wait));
          duration = duration > 0 ? duration : moment.duration(0);
          return humanizeDuration(duration);

        },
        //время ожидания поиска машины
        getWaitDuration: function() {
          // console.log(111111,this.tme_wait)
          var localTime = moment()// + this.tme_reg_period * 1000;
          var duration = moment.duration(localTime - moment(this.tme_reg));
          duration = duration > 0 ? duration : moment.duration(0);
          return humanizeDuration(duration);
        },
        //время до подъезда машины
        getReayDuration: function() {
          var d = moment().diff(moment(this.tme_wait));
          var negative = false;
          if (d > 0)
            negative = true;
          d = moment.duration(d);
          var hours = Math.abs(parseInt(d.asHours())).toString();
          hours = hours.length == 1 ? ("0" + hours) : hours;
          var minutes = Math.abs(d.minutes()).toString();
          minutes = minutes.length == 1 ? ("0" + minutes) : minutes;
          var seconds= Math.abs(d.seconds());
          seconds = seconds.toString().length == 1 ? ("0" + seconds) : seconds;
          var str = minutes + ":" + seconds;
          if (hours != '00') {
            str = hours + ":" + str;
          }
          if (negative) {
            str = '-' + str;
          }
          return str;
        },
        //водитель задерживается
        driverDelay: function() {
          var d = moment().diff(moment(this.tme_wait));
          return d > 0
        },
        getTime: function(tme) {
          return moment(tme).format("HH:mm");
        },
        getHumanDatetime: function(tme) {
          return moment(tme).format("D MMMM HH:mm");
        },
        reduceOptions: function() {
          var self = this;
          return app.getOpts(self.trf ? self.trf.id : null).then(function(res) {
            return _.intersection(self.options, _.pluck(res, "name"));
          });
        },

        getState: function() {
          var text = this.states[this.state];
          return text;
        },
        add: function(addr, id) {
          var cid = this.adds.length - 1;
          id = id ? parseInt(id) : this.adds.length;
          addr.srt = id;
          addr.twn_id = Config.TWN_ID_DEFAULT;
          if (id > cid) {
            this.adds.push(addr);
          } else {
            this.adds[id] = addr;
          }
        },
        del: function(id) {
          if (this.adds.length > 1) {
            this.adds.splice(id, 1);
          }
        },
        // тариф
        trf_: order.trf_ || null,
        get trf() {
          if (this.trf_) {
            return this.trf_;
          } else {
            return app.trf;
          }
        },
        set trf(id) {
          this.trf_ = _.findWhere(app.trfs, {
            id: id
          });
        },
        // служба
        srv_id_: order.srv_id_ || null,
        get srv_id() {
          if (this.srv_id_) {
            return this.srv_id_;
          } else {
            return this.trf ? _.first(this.trf.srv_ids) : null;
          }
        },
        set srv_id(id) {
          this.srv_id_ = id;
        },

        get duration() {
          // предполагаемое время прибытия машины
          if (this.getState()) {
            return moment.duration(this.dist_km / Config.AVERAGE_SPEED, 'hours').minutes(); //.humanize();
          } else {
            // console.log(this.trf);
            return this.trf.time;
          }
        },

        // стоимость
        getCost: function() {
          //console.log("getCost");
          var self = this;
          var srv_id = app.getSrvId(self);
          var tariffId = app.getTrfId(self);
          delete self.error;

          if (self.complete) {

            // если адрес имеет adr_id, то "выбрасываем" всё остальное
            // ========================================================

            // var adrs = _.map(this.adds, function(i) {
            //   return i.adr_id ? {
            //     adr_id: i.adr_id
            //   } : i;
            // });

            var adrs = _.map(self.adds, function(i) {
              return i;
            });

            // ========================================================

            return self.reduceOptions().then(function(res) {
              self.options = res;
              var def = costRes.get({
                adrs: adrs,
                twn_id: app.twn_id,
                srv_id: srv_id,
                trf_id: tariffId,
                need_taxom: 1,
                ord_type: self.type ? 1 : 0,
                datetime: self.tme_drv,
                options: self.options,
                card: app.card,
                promo: app.promo.enabled ? app.promo.text : null
              }).$promise;

              self.wtd_cost = null;
              self.dist_km = null;

              return def.then(function(res) {
                if (res.error) {
                  throw res;
                } else {
                  // добавляем id адреса
                  self.adrs = _.map(self.adrs, function(i, k) {
                    i.id = res.route[k].id;
                    i.adr_id = res.route[k].id;
                    return i;
                  });
                  // ======================
                  // console.log(res);
                  self.optionsSum = res.optionsSum;
                  self.plusSum = res.plusSum;
                  self.pureCost = res.wtd_cost;
                  self.wtd_cost = res.wtd_cost + (res.optionsSum || 0);
                  self.dist_km = res.dist_km;
                  self.badPromo = res.badPromo;
                  self.usePromo = res.usePromo;

                  if (res.card && !res.card.stay) {
                    self.badPromo = false;
                    self.oldPromo = true;
                  } else {
                    if (res.promo && res.card && !res.card.exist) {
                      var event = new CustomEvent('newCardEvent', {
                        detail: res.card
                      });
                      document.dispatchEvent(event);
                    }
                    if (res.card && res.card.exist) {
                      var event = new CustomEvent('setCardEvent', {
                        detail: res.card
                      });
                      document.dispatchEvent(event);
                    }
                  }

                  var balance = app.card && app.card.type == 8 ? self.wtd_cost - app.card.balance : self.wtd_cost;
                  // сколько спишется с накопительной карты
                  self.cash = balance > 0 ? balance : 0;
                }
              }).catch(function(err) {
                console.log("ERR:", err);
                var error = {
                  code: err.data.code,
                  text: err.data.details,
                  data: err.data.error_data
                };
                // сообщение об ошибке
                if (err.data.taxom) {
                  var taxom = err.data.taxom;
                  var zones = taxom.geo_zones.length;
                  var info = _.reduce(taxom.tariff, function(memo, val, key) {
                    var res = _.extend(memo, val);
                    var zones_dist = _.sortBy(val.zones_dist, 'dst');
                    var firstDist = _.first(zones_dist);
                    if (val.prc_dst_km && val.prc_dst_km > 0) {
                      // определена минимальная цена
                      res.free_dst_km = 0;
                    } else {
                      // минимальная цена не определена
                      if (firstDist && firstDist.dst > 0) {
                        res.free_dst_km = firstDist.dst / 1000;
                      } else {
                        res.free_dst_km = 0;
                      }
                    }
                    return res;
                  }, {});
                  if (
                    error.text == 'В базе нет координат адреса'
                  ) {
                      error.text = 'Произвольный адрес';
                  }
                  if (
                    error.text == 'Для данного тарифа и/или города расчёт неопределён'
                  ) {
                      error.text = 'Тариф по таксометру';
                  }
                  if (info.free_dst_km) {
                    self.error = "<div>{0}</div>\
    										 <div>Посадка: {1} &#8381;</div>\
    										 <div>Километр: {2} &#8381;</div>\
    										 <div>Бесплатное расстояние {3} км</div>"
                      .format(error.text, info.prc_brd, info.prc_dst_km, info.free_dst_km)
                  } else {
                    self.error = "<div>{0}</div>\
                          <div>Посадка: {1} &#8381;</div>\
                          <div>Километр: {2} &#8381;</div>"
                    .format(error.text, info.prc_brd, info.prc_dst_km);
                  }
                } else {
                  self.error = error.text;
                }
                // подсветка неверного адреса
                _.each(error.data, function(i) {
                  self.adds[i].error = true;
                })
                console.error(error);
              });
            });
          } else {
            var def = $q.defer();
            def.reject({
              data: {
                error: "99:Неполный маршрут!"
              }
            });
            return def.promise;
          }
        },
        create: function(tel) {
          if (app.card && app.card.type == 3 && app.card.balance < this.wtd_cost) {
            var defer = $q.defer();
            defer.reject({
              data: {
                detail: "На карте недостаточно средств"
              }
            });
            return defer.promise;
          }
          delete this.id;
          this.tel = tel;
          this.type = this.type ? 1 : 0;
          this.tariffId = this.trf.tariffId;
          this.twn_id = app.twn_id;
          var self = this;
          var req = _.clone(this);
          return self.reduceOptions().then(function(res) {
            req.options = res;

            req.srv_id = app.getSrvId(self);
            req.tariffId = app.getTrfId(self);

            if (app.promo.enabled && app.promo.text) {
              // добавляем промо-код
              req.promo = app.promo.text;
            } else if (_.isObject(app.card)) {
              // добавляем карту
              req.crd_id = app.card.id;
              req.crd_num = app.card.num;
              req.crd_type = app.card.type;
              req.crd_rem = app.card.rem;
              if (app.card.type == 8) {
                req.crd_num = (app.card.writeOff ? '-' : '+') + req.crd_num;
              }
              // req.tariffId = app.card.trf_id == 31415 ? undefined : app.card.trf_id;
              // req.srv_id = app.card.srv_id || this.srv_id || app.getDefaultSrv() || undefined;
            }
            // if (DEBUG) req.srv_id = 254;
            return orderRes.save(req).$promise;
          });
        },
        delete: function() {
          return orderRes.remove({
            id: this.id,
            version: this.version
          }).$promise;
        },
        crewCall: function() {
          return orderRes.crewCall({
            id: this.id,
          }).$promise;
        },
        update: function() {
          var self = this;
          return orderRes.getOne({
            id: self.id
          }).$promise.then(function(res) {
            var adds = _.map(res.adds, function(addr) {
              return new Addr(addr);
            });
            delete res.adds;
            while (self.adds.pop()) {}
            _.each(adds, function(addr) {
              self.adds.push(addr);
            });
            res.options = _.forEach(res.options, function(i) {
              i.icon = Config.OPTION_ICONS[i.name];
            });

            console.warn('OPTIONS',res);

            if (self.state != res.state && _.contains(Config.ORDER_STATES_FOR_NOTIFY, res.state)) {
              if (window.Media) {
                mediaSrv.loadMedia(Config.ORDER_STATE_AUDIO_NOTIFY_URL).then(function(media) {
                  media.play();
                });
              }
            }
            _.extend(self, res);
            return res;
          });
        }
      };
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.services')
    .factory("dataTransform", dataTransform);


  function dataTransform() {
    return {
      pin: function(i) {
        return {
          msisdn: i.tel
        }
      },
      addr0: function(i) {
        i.title = i.title ? i.title : i.street + " " + (i.house || '');
        return {
          adr_id: i.id,
          twn_id: i.townId,
          type: i.type == "POI" ? 2 : 9,
          nme: i.type == "POI" ? i.title : i.street,
          rem: i.title,
          stt: i.type == "POI" ? i.title : i.street,
          value: i.name,
          hse: i.house,
          lat: i.lat,
          lon: i.lon
        }
      },
      addr: function(i) {
        i.title = i.title ? i.title : i.street + " " + (i.house || '');
        return {
          adr_id: i.id ? i.id : i.adr_id,
          twn_id: i.townId,
          type: i.type == "street" ? 9 : 2,
          nme: i.title,
          rem: i.title,
          stt: i.title,
          hse: i.hse,
          lat: i.lat,
          lon: i.lon
        }
      },
      addrReverse: function(i) {
        return {
          id: i.id ? i.id : i.adr_id,
          townId: i.twn_id,
          type: i.type == 2 ? 'POI' : 'BUILDING',
          name: i.type == 2 ? i.adr : i.adr + ' ' + i.hse || '',
          street: i.adr,
          house: i.hse,
          entrance: i.ent,
          lat: i.lat,
          lon: i.lon
        };
      },
      order: function(i) {
        var states = {
          "OFFERED": 0,
          "REQUESTED": 1,
          "ACCEPTED": 2,
          "READY": 3,
          "CANCELED": 4,
          "STARTED": 6,
          "DONE": 5,
          "FINISHED": 7,
          "RESERVED": 8
        };
        return {
          id: i.id,
          st: _.contains(["DONE", "CANCELED"], i.state) ? 70 : 20,
          cost: i.cost || i.expectedCost,
          state: states[i.state],
          twn_id: i.townId,
          tme_reg: moment(i.createdAt).format("DD.MM.YYYY HH:mm"),
          createdAt: i.createdAt,
          adds: [{
            adr_id: i.addressSourceId,
            twn_id: i.townId,
            type: i.addressSourceType == "POI" ? 2 : 9,
            adr: i.addressSourceStreet,
            hse: i.addressSourceHouse,
            ent: i.addressSourceEntrance,
            lat: i.addressSourceLat,
            lon: i.addressSourceLon
          }, {
            adr_id: i.addressDestId,
            twn_id: i.townId,
            type: i.addressDestType == "POI" ? 2 : 9,
            adr: i.addressDestStreet,
            hse: i.addressDestHouse,
            ent: i.addressDestEntrance,
            lat: i.addressDestLat,
            lon: i.addressDestLon
          }]
        };
      },

      orderOne: function(i) {
        var states = {
          "OFFERED": 0,
          "REQUESTED": 1,
          "ACCEPTED": 2,
          "READY": 3,
          "CANCELED": 4,
          "STARTED": 6,
          "DONE": 5,
          "FINISHED": 7,
          "RESERVED": 8
        };

        // console.log((moment() - moment(i.createdAt)) / 1000);
        // console.log('orderOne',i.createdAt)
        return {
          id: i.id,
          version: i.version,
          st: _.contains(["DONE", "CANCELED"], i.state) ? 70 : 20,
          state: states[i.state],
          cost: i.cost,
          wtd_cost: i.expectedCost,
          pureCost: i.pureCost,
          optionsSum: i.optionsSum,
          navitaxCalc: i.navitaxCalc,
          cash: i.cash,
          options: i.oldOptions,
          // tme_wait: i.waitedAt,
          crewGeo: i.crewGeo,
          twn_id: i.town.id,
          tme_reg: moment(i.createdAt),
          tme_brd: moment(i.startedAt),
          tme_wait: moment(i.waitedAt),
          tme_reg_period: Math.round((moment() - moment(i.createdAt)) / 1000),
          createdAt: i.createdAt,
          srv_id: i.office.id,
          trf_id: i.tariff.id,
          adds: _.map(i.route, this.addr),
          auto: i.car ? i.car.model : "",
          auto_nom: i.car ? i.car.nom : ""
        };
      },
      makeOptionsRemarks: function(s, i, k) {
        return s;
      },
      options: function(s, i, k) {
        switch (i) {
          case "nosmoke":
            s.smoking = false;
            break;
          case "smoke":
            s.smoking = true;
            break;
          case "ticket":
            s.needTicket = true;
            break;
          case "bag":
            s.baggage = {
              remarks: "",
              type: "LITTLE"
            };
            break;
          case "largeBag":
            s.baggage = {
              remarks: "",
              type: "LARGE"
            };
            break;
          case "pet":
            s.animal = {
              remarks: "",
              type: "BIG"
            };
            break;
          case "cash5000":
            s.bigNote = {
              remarks: "",
              value: 5000
            };
            break;
          case "babyFix":
            s.child = {
              remarks: "",
              fix: true,
              age: 3
            };
            break;
          default:
            s.needTicket = false;
            break;
        }
        return s;
      },
      optionsReverse: function(opts) {
        for (var i = 0; i < i.length; i++) {

        }
      },
      orderReverse: function(i) {
        // console.warn("ORDER:", i);
        return {
          townId: i.twn_id,
          officeId: i.srv_id,
          tariffId: i.trf_id,
          cardId: i.crd_id,
          cardMethod: _.first(i.crd_num) == "-" ? "WRITE-OFF" : "ACCUM",
          promo: i.promo,
          route: _.map(i.adds, this.addrReverse),
          options: _.reduce(i.options, this.options, {}),
          oldOptions: i.options,
          remarks: i.rem
        };
      },
      rater: function(i) {
        return {
          townId: i.twn_id,
          officeId: i.srv_id,
          tariffId: i.trf_id,
          datetime: i.datetime,
          promo: i.promo,
          options: i.options,
          cardId: i.card ? i.card.id : null,
          route: _.map(i.adrs, this.addrReverse)
        };
      },
      raterReverse: function(i) {
        var result = {
          wtd_cost: i.cost || i.wtd_cost,
          dist_km: i.distance,
          twn_id: i.townId,
          srv_id: i.officeId,
          trf_id: i.tariffId,
          promo: i.promo,
          cardMethod: i.cardMethod,
          badPromo: i.promo == "USE" ? false : (i.card ? true : false),
          usePromo: i.promo == "USE",
          optionsSum: i.optionsCost,
          // ===================
          error: i.error,
          details: i.error ? i.error.replace(/\d*:/g, "") : "",
          error_data: i.error_data,
          taxom: i.taxom
        };
        if (i.card) {
          console.warn("rater card", i.card);
          result.card = {
            id: i.card.id,
            stay: i.card.balance,
            balance: i.card.balance,
            num: i.card.number,
            type: i.card.type == "DEBET" ? 3 : 8,
            srv_id: i.card.officeId,
            trf_id: i.card.officeId,
            reit: i.card.reit,
            exist: i.promo == "EMIT"
          }
        }
        return result;
      },
      town: function(i) {
        return {
          id: i.townId,
          nme: i.townTitle
        }
      },
      tariffs: function(i) {
        return {
          tel: i.tel,
          twn_name: i.townTitle,
          twn_id: i.townId,
          mobileReservation: i.mobileReservation,
          optionsCost: i.optionsCost,
          trfs: _.map(i.tariffs, function(t) {
            return {
              srv_nme: t.officeTitle,
              level: t.level,
              srv_ids: [t.officeId],
              tariffId: t.tariffId,
              mincost: t.mincost,
              nme: t.title,
              time: t.time,
              options: t.options,
              desc: t.desc,
              default: t.default
            }
          })
        }
      }
    };
  }
})();

(function() {
  'use strict';
  angular.module('app', [])
})();

angular.module('app.filters', ['ngStorage']).filter('removedOrders', function($localStorage, _) {
  return function(orders) {
    return _.filter(orders, function(order) {
      return !_.include($localStorage.removedOrders, order.id);
    });
  };
});

(function() {
  'use strict';
  angular.module('app.directives', [])
  .directive('detectGestures', function($ionicGesture) {
  return {
    restrict :  'A',

    link : function(scope, elem, attrs) {
      var gestureType = attrs.gestureType;
      switch(gestureType) {
        case 'swipe':
          $ionicGesture.on('swipe', scope.reportEvent, elem);
          break;
        case 'swiperight':
          $ionicGesture.on('swiperight', scope.reportEvent, elem);
          break;
        case 'swipeleft':
          $ionicGesture.on('swipeleft', scope.reportEvent, elem);
          break;
        case 'doubletap':
          $ionicGesture.on('doubletap', scope.reportEvent, elem);
          break;
        case 'tap':
          $ionicGesture.on('tap', scope.reportEvent, elem);
          break;
        case 'scroll':
          $ionicGesture.on('scroll', scope.reportEvent, elem);
          break;
      }

    }
  }
})
  .directive('inputMask', function() {
      return {
        link: function(scope, element, attrs) {
          $(element).mask('+7 (000) 000 00 00', {
            placeholder: "+7 (•••) ••• ••••"
          });
        }
      }
    })
    .directive('keyFocus', function() {
      return {
        restrict: 'A',
        link: function(scope, elem, attrs) {
          elem.on('keyup', function(e) {
            // up arrow
            if (e.keyCode == 13) {
              var i = $('[key-focus]', 'body').index($(elem));
              if (i != -1)
                $('[key-focus]', 'body').eq(i + 1).focus();

              // if(!scope.$last) {
              //   elem[0].nextElementSibling.focus();
              // }
            }
          });
        }
      };
    })
    .directive("autoFocus", function($timeout,Config ) {
      return {
        scope: {
          trigger: "=autoFocus"
        },
        link: function(scope, element) {
          scope.$watch("trigger", function(value) {
            if (value) {
              $timeout(function() {
                element[0].focus();
                if (window.cordova && cordova.plugins && cordova.plugins.Keyboard) cordova.plugins.Keyboard.show();
              }, Config.AUTO_FOCUS_DELAY);
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
          if (!scope._usingTouch)
            fn();
        });
      }
    }]);
})();

(function() {
  'use strict';
  angular
    .module('app.controllers', ['app.services', 'app.providers', 'ngStorage', 'app.filters', 'app.resources']);
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('TownSelectCtrl', TownSelectCtrl);


  function TownSelectCtrl($scope, $state, $stateParams, $localStorage, user, Order, _, app, toast) {
      $scope.app = app;
      $scope.user = user;
      $scope.twnSelect = function(twn) {
        user.order = new Order();
        app.twn_id = twn.id;
        $localStorage.twn_id = twn.id;
        user.arcAddsLoad();
        $state.go("app.main");
      }
    }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderPromoCtrl', OrderPromoCtrl);


  function OrderPromoCtrl($scope, $state, $stateParams, user, app, Order, _) {
    //$ionicLoading.show();
    $scope._ = _;
    $scope.promo = app.promo || {};
    $scope.orderSetPromo = function() {
      app.promo.enabled = true;
      app.card = null;
      $state.go("app.main");
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderCardsCtrl', OrderCardsCtrl);


  function OrderCardsCtrl($scope, $state, $stateParams, user, app, Order, _, toast, Config, $ionicPopup) {

    $scope.promo = app.promo || {};
    $scope.orderSetPromo = function() {
      app.promo.enabled = true;
      app.card = null;
      $state.go("app.main");
    };
    $scope.showPromoPopup = function() {
      $scope.data = {};

      // An elaborate, custom popup
      var myPopup = $ionicPopup.show({
        template: '<label class="item item-input item-floating-label pincode">\
                    <i class="material-icons placeholder-icon">&#xE89A;</i>\
                    <input type="text" autocomplete="off" placeholder="" ng-model="promo.text" auto-focus="true"/>\
                  </label>',
        title: 'Промокод',
        scope: $scope,
        buttons: [{
          type: 'button-clear',
          text: 'Отмена'
        }, {
          type: 'button-clear button-ok',
          text: 'Ипользовать',
          onTap: function(e) {
              $scope.orderSetPromo();
          }
        }]
      });

    };

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
        $scope.showPromoPopup();
        // $state.go("app.orderPromo");
      } else if (card) {
        $state.go("app.orderCard", {
          id: card.id
        });
      } else {}
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
        $scope.showPromoPopup();
        // $state.go("app.orderPromo");
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
      }, Config.CARD_EDIT_TIMEOUT);
    }
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderCardCtrl', OrderCardCtrl);


  function OrderCardCtrl($scope, $state, $stateParams, user, app, Order, _) {
    //$ionicLoading.show();
    $scope._ = _;
    $scope.card = user.getCard($stateParams.id);
    $scope.orderSetCard = function() {
      app.card = $scope.card;
      app.promo.enabled = false;
      $state.go("app.main");
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderAdvanceCtrl', OrderAdvanceCtrl);


  function OrderAdvanceCtrl($scope, $cordovaDatePicker, $state, $stateParams, $interval, utils, app, user, moment, _, Config) {

    function round(x, r) {
      return parseInt(x / r) * r + r;
    }



    $scope.order = user.order;
    $scope.opts = [];

    $scope.twn = _.findWhere(app.trfs_, {
      twn_id: app.twn_id
    });

    $scope.datePick = function() {
      var options = {
        date: new Date(),
        mode: 'time', // or 'time'
        minDate: new Date(),
        allowOldDates: false,
        allowFutureDates: true,
        doneButtonLabel: 'DONE',
        doneButtonColor: '#F2F3F4',
        cancelButtonLabel: 'CANCEL',
        cancelButtonColor: '#000000'
      };
      $cordovaDatePicker.show(options).then(function(date){
          alert(date);
      });
    };

    app.getOpts(user.order.trf ? user.order.trf.id : null).then(function(res) {
      // копия с полного набора опций
      $scope.opts = _.map(res, _.clone);
      var o = $scope.opts;
      $scope.groupedOpts = [];
      var row = 0;
      while (o.length) {
        if ($scope.groupedOpts[row]) {
          $scope.groupedOpts[row].push(o.shift());
        } else {
          $scope.groupedOpts[row] = [o.shift()];
        }
        if ($scope.groupedOpts[row].length == 4) {
          row+=1;
        }
      }
      // console.log($scope.groupedOpts);
      // установка существующих опций
      _.forEach(_.flatten($scope.groupedOpts), function(i) {
        if (_.contains(user.order.options, i.name)) i.enabled = true;
      });
      // console.log(_.flatten($scope.groupedOpts))
    });

    $scope.dates = _.map(_.range(0, Config.DAYS_FOR_ADVANCE_ORDER), function(i) {
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
        var max = $scope.now.clone().add(Config.DAYS_FOR_ADVANCE_ORDER, "days");
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

    $scope.utils = utils;
    $scope.$watch('groupedOpts', function(newVal, oldVal) {
      $scope.cost = 0;
      $scope.count = 0;
      if (true || !_.isEqual(newVal, oldVal)) {
        var opts = _.pluck(_.where(_.flatten($scope.groupedOpts), {
          enabled: true
        }), "name");
        user.order.options = opts;
        $scope.count = opts.length;
        $scope.cost = _.reduce(_.flatten($scope.groupedOpts), function(s, o){
          return (o.enabled && o.cost ) ? (s + o.cost) : s;
        }, 0);
        console.log($scope.count,$scope.cost)
      }

      $scope.moment.enabled = !!_.findWhere(_.flatten($scope.groupedOpts), {
        name: "reservation",
        enabled: true
      });
    }, true);

    $scope.clickOption = function(opt) {
      opt.enabled = !opt.enabled;
      $scope.lastOption = opt.enabled ? opt : null;
    };

    $scope.$watch('moment', function(newVal, oldVal) {
      if (!_.isEqual(newVal, oldVal)) {
        user.order.type = $scope.moment.enabled;
        user.order.tme_drv = $scope.moment.moment;
      }
    }, true);

    $scope.orderSetOptions = function() {
      user.order.type = $scope.moment.enabled;
      user.order.tme_drv = $scope.moment.moment;
      user.order.options = _.pluck(_.where(_.flatten($scope.groupedOpts), {
        enabled: true
      }), "name");
      $state.go("^.main");
    };

    $scope.back = function() {
      $state.go("^.main");
    };

    $scope.toggleOpt = function(opt) {
      console.log(opt);
    }
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderAccepted', OrderAccepted);


  function OrderAccepted($scope, app, Config, leafletData) {

    var $orderScope = $scope.$parent;



    $scope.deviceHeight = window.screen.height;
    $scope.map = {
      defaults: {
        center: {
          lat: Config.TOWN_CORDS[app.twn_id][0],
          lng: Config.TOWN_CORDS[app.twn_id][1],
          zoom: 12
        },
        tileLayer: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        maxZoom: 18,
        zoomControl: false
      }
    };
    var fit_bounded = false;
    $scope.$watch('order', function(order, old) {
      if (
        order.crewGeo
      ) {
        $scope.markers[0] = {
          lat: order.crewGeo.lat,
          lng: order.crewGeo.lon,
          icon: {
            type: 'div',
            className: 'map-crew-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -45],
            html: "<img src='main/assets/images/taxi-location.png'>\
                  <div class='pulse red'></div>"
          },
        };
        $scope.map.defaults.center = {
          lat: order.crewGeo.lat,
          lng: order.crewGeo.lon
        };
      }
      if (
        order.adds
      ) {
        var addr = order.adds[0];
        $scope.markers[1] = {
          lat: addr.lat,
          lng: addr.lon,
          icon: {
            type: 'div',
            className: 'map-order-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -45],
            html: "<img src='main/assets/images/user-location.png'>\
                  <div class='pulse red'></div>"
          }
        };
      }
      // <i class=""></i>
      if (!fit_bounded && $scope.markers[0] && $scope.markers[1]) {
        fit_bounded = true;
        leafletData.getMap().then(function(map) {
          map.fitBounds([
            [order.crewGeo.lat, order.crewGeo.lon],
            [order.adds[0].lat, order.adds[0].lon]
          ]);
        });
      }

    }, true);
    $scope.markers = [];
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('OrderCtrl', OrderCtrl);


  function OrderCtrl($scope, toast, $ionicPopup, $state, $stateParams, $interval, $ionicLoading, orderRes, Addr, Order, user, app, Config) {
    $ionicLoading.show();
    var order = _.findWhere(user.curOrders, {
      id: $stateParams.id
    }) || {
      id: $stateParams.id
    };

    // var states = {
    //   "OFFERED": 0,
    //   "REQUESTED": 1,
    //   "ACCEPTED": 2,
    //   "READY": 3,
    //   "CANCELED": 4,
    //   "STARTED": 6,
    //   "DONE": 5,
    //   "FINISHED": 7,
    //   "RESERVED": 8
    // };
    var states = {
      0: "Поиск машины",
      1: "Поиск машины",
      2: "Машина едет",
      3: "Машина подъехала",
      4: "Заказ отменен",
      5: "Заказ выполнен",
      6: "Приятной поездки",
      7: "Приехали",
      8: "Предвариельный"
    };

    // $scope.summary = $stateParams.summary;
    $scope.cancelSummary = function() {
      $scope.summary = false;
    };
    $scope.toOrderSummary = function() {
      $scope.summary = true;
      // console.log(1);
      // $state.go("app.orderState", {
      //   id: order.id,
      //   summary:true
      // });
    };


    $scope.orderCallCrew = function() {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Связь с водителем',
        template: '<div class="text">Вы уверены, что хотите связаться с водителем?</div>',
        cancelText: 'Отмена',
        cancelType: 'button-clear',
        okText: 'Да',
        okType: 'button-clear button-ok',
      });

      confirmPopup.then(function(res) {
        if (res) {
          $scope.callCrew = true;
          $scope.calCrewLoading = true;
          $scope.order.crewCall().then(function() {
            $scope.calCrewLoading = false;
            setTimeout(function(e) {
              $scope.callCrew = false;
            },30 * 1000);
            toast('Звонок заказан');
          }).catch(function() {
            toast('Ошибка');
          });
        } else {
          console.log('false')
        }
      });
    };

    $scope.orderRepeatBack = function(order) {
      app.twn_id = _.first(order.adds).twn_id;
      order.options = order.options.map(function(opt) {
        return opt.name;
      });
      user.order = new Order(order);
      user.order.adds = user.order.adds.reverse(); //swapAdds(1);
      $state.go("app.main");
    };

    $scope.orderRepeat = function(order) {
      app.twn_id = _.first(order.adds).twn_id;
      order.options = order.options.map(function(opt) {
        return opt.name;
      });
      user.order = new Order(order);
      $state.go("app.main");
    };

    $scope.order = new Order(order);
    $scope.order.update().then(function(res) {
      $ionicLoading.hide();
      $scope.title = states[$scope.order.state];
      if (res.wtd_cost <= 0) {
        $scope.order.error = Config.NO_WTD_COST_ERR_MSG;
      }

    });
    user.orderInterval = $interval(function() {
      console.log($scope.order.state);
      //если заказ закрыт то не обновляем его
      $scope.title = states[$scope.order.state];
      if ($scope.order.state != 5) {
        $scope.order.update(orderRes).then(function(res) {

        });
      }

    }, Config.ORDER_UPDATE_DURATION);



    $scope.orderCancel = function() {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Отмена заказа',
        template: '<div class="text">Вы уверены, что хотите отменить заказ?</div>',
        cancelText: 'Отмена',
        cancelType: 'button-clear',
        okText: 'Да',
        okType: 'button-clear button-ok',
      });

      confirmPopup.then(function(res) {
        if (res) {
          $scope.order.delete(orderRes).then(function() {
            delete $scope.order.id;
            $state.go("app.main");
            toast('Заказ будет отменен');
          }).catch(function() {
            toast('Ошибка');
          });
        } else {
          console.log('false')
        }
      });
    };

    //
    // $scope.orderCancel = function() {
    //   $scope.order.delete(orderRes).then(function() {
    //     delete $scope.order.id;
    //     $state.go("app.main");
    //   });
    // };

  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('MainCtrl', MainCtrl);


  function MainCtrl(
    $scope,
    $rootScope,
    $state,
    $stateParams,
    $timeout,
    $ionicLoading,
    $ionicPopover,
    geolocationRes,
    orderRes,
    Addr,
    Order,
    app,
    user,
    _,
    toast,
    utils) {

    console.log('Start main ctrl');

    $ionicPopover.fromTemplateUrl('main/templates/order-form/options-popover.html', {
      scope: $scope,
      animation: 'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.optionsPopover = popover;
    });

    $scope.showOptionsPopover = function($event) {
      $scope.optionsPopover.show($event);
    };

    $ionicPopover.fromTemplateUrl('main/templates/order-form/cards-popover.html', {
      scope: $scope,
      animation: 'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.cardsPopover = popover;
    });

    $scope.showCardsPopover = function($event) {
      $scope.cardsPopover.show($event);
    };

    $scope.reportEvent = function(e) {
      console.log(e);
    }
    $scope._ = _;
    $scope.order = user.order;
    $scope.user = user;
    $scope.app = app;

    $scope.utils = utils;

    $scope.loadingCost = false;

    $scope.gotoTwnSelect = function() {
      $state.go('app.townSelect');
    };

    $scope.state = {
      tel: true,
      urgentShow: user.order.trf && user.order.trf.level == 5,
      urgent: false,
      urgentCost: null,
      urgentTime: null
    };

    app.getTrfs().then(function(res) {
      res.forEach(function(t) {
        // t.icon = newIcons[t.icon];
        if ((t.desc || t.name) == 'Комфортно') {
          t.desc = 'Комфорт';
        }
      });
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
      $scope.loadingCost = true;
      user.order.getCost()
        .then(function() {
          $scope.loadingCost = false;
        }).catch(function() {
          $scope.loadingCost = false;
        });
    });

    $scope.trfChange = function(trf) {
      console.log(trf);
      var notify = [];
      if (trf.mincost) {
        notify.push('от ' + trf.mincost + ' рублей');
      }
      if (trf.time) {
        var tmend = trf.time.split('-')[1] ? trf.time.split('-')[1] : trf.time;
        notify.push('через ' + trf.time + ' ' + utils.declOfNum(tmend, ['минуа', 'минуты', 'минут']));
      }
      notify = notify.join(', ');
      notify = trf.name ? (trf.name + ': ' + notify) : notify;
      toast(notify);
      var id = trf.id;
      user.order.trf = id;
      setActiveOptions();
      $scope.loadingCost = true;
      user.order.getCost()
        .then(function() {
          $scope.loadingCost = false;
        }).catch(function() {
          $scope.loadingCost = false;
        });
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
        $scope.loadingCost = true;
        user.order.getCost()
          .then(function() {
            $scope.loadingCost = false;
          }).catch(function() {
            $scope.loadingCost = false;
          });
      } else {
        $scope.order.trf = $scope.state.order_trf || _.findWhere(app.trfs, {
          default: true
        }).id;
        $scope.order.type = $scope.state.order_type || 0;
        $scope.loadingCost = true;
        user.order.getCost()
          .then(function() {
            $scope.loadingCost = false;
          }).catch(function() {
            $scope.loadingCost = false;
          });
        setActiveOptions();
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
        toast(err.data.details);
        console.error(err);
      }).finally(function() {
        $ionicLoading.hide();
      });
    };

    $scope.gotoAdvance = function() {
      $state.go("app.orderAdvance")
      $scope.optionsPopover.hide();
    };

    $scope.gotoPromo = function() {
      $state.go("app.orderPromo");
    };

    $scope.gotoCards = function() {
      $state.go("app.orderCards")
      $scope.cardsPopover.hide();
    };


    $scope.clearOptions = function() {
      user.order.options = [];
      setActiveOptions();
      $scope.optionsPopover.hide();
    }

    $scope.clearPromo = function() {
      app.promo.enabled = false;
      app.card = null;
      $scope.cardsPopover.hide();
    }
    $scope.activeOptions = [];

    $scope.deviceWidth = window.screen.width;

    var setActiveOptions = function() {
      return app.getOpts(user.order.trf ? user.order.trf.id : null).then(function(opts) {
        return user.order.reduceOptions().then(function(res) {
          $scope.activeOptions = _.filter(opts, function(i) {
            return _.contains(res, i.name);
          });
        });
      });
    };
    setActiveOptions();
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('LoginCtrl', LoginCtrl);


  function LoginCtrl(Config, $ionicPopup, $scope, $state, $ionicLoading, $localStorage, $timeout, pinRes, authRes, userRes, app, user, toast, _) {
    if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();


    user.profile = null;
    authRes.delete(function() {
      user.lgn = null;
      console.info("user deleted");
    });

    $scope.app = app;
    $scope.user = user;
    $scope.user.smsSended = false;
    $localStorage.userProfile = null;
    // delete $localStorage.userProfile

    $scope.getPin = function(opts) {
      // запрос ПИН кода
      user.error = false;
      $ionicLoading.show();
      var sms = opts ? !!opts.sms : Config.SMS_PIN
      pinRes.save({
        tel: $scope.user.canonicalPhone(),
        sms: sms
      }).$promise.then(function(res) {
        // OK
        $scope.user.authMethod = "pin";
        if (Config.ENV.DEBUG) {
          toast(res.details);
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
      var authMethod = $scope.user.authMethod;
      if ($scope.user.pin.length > 4) {
        authMethod = 'password';
      }
      authRes.save({
        login: $scope.user.canonicalPhone(),
        secret: $scope.user.pin,
        method: authMethod
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

    app.getTrfs()
    $scope.townsDialog = function() {
      if (!app.twn_id) {
        app.twn_id = 3;
      }
      $ionicPopup.show({
        templateUrl:'main/templates/dialogs/townsDialog.html',
        title: 'Выберите город',
        scope: $scope,
        buttons: [{
          type:'button-clear',
          text: 'Отмена'
        },{
          type:'button-clear button-ok',
          text: 'Далее',
          onTap:function(e) {
            $state.go("guest.main");
          }
        }]
      }).then(function(popup) {
        $scope.townsPopup = popup;
      });
    };

    $scope.twnSelect = function(twn) {
      $scope.app.twn_id = twn.id;
      $localStorage.twn_id = twn.id;
    };


    var loginOk = function() {
      $state.go("app.main", null, {
        reload: true
      });
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('HistoryCtrl', HistoryCtrl);


  function HistoryCtrl($scope,$ionicPopover, $state, $stateParams, $localStorage, toast, user, app, Order, _) {
    //$ionicLoading.show();
    $scope._ = _;
    $scope.orderShowState = function(order) {
      $state.go("app.orderState", {
        id: order.id
      });
    };
    $scope.orderRepeat = function(order) {
      app.twn_id = _.first(order.adds).twn_id;
      user.order = new Order(order);
      $state.go("app.main");
    };

    $scope.orderRepeatBack = function(order) {
      app.twn_id = _.first(order.adds).twn_id;
      order.options = order.options.map(function(opt) {
        return opt.name;
      });
      user.order = new Order(order);
      user.order.adds = user.order.adds.reverse(); //swapAdds(1);
      $state.go("app.main");
    };

    $scope.orderRemove = function(order) {
      var removedOrders = $localStorage.removedOrders || [];
      removedOrders.push(order.id);
      $localStorage.removedOrders = removedOrders;
    };

    $scope.orderCancel = function(order) {
      $order.delete().then(function() {
        $state.go("app.main");
      });
    };


    $scope.callAction = function(action) {
      console.log(action);
      action.action.call(this,$scope.action_arg);
      $scope.closePopover();
    };

    // popover actions

    $scope.popover = $ionicPopover.fromTemplateUrl('main/templates/order-history-popover.html', {
      scope: $scope,
      animation:'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.popover = popover;
    });

    $scope.openPopover = function($event,ord) {
      $scope.actions = [{
        title:'Подробнее',
        action:$scope.orderShowState
      },{
        title:'Повторить',
        action:$scope.orderRepeat
      },{
        title:'Повторить',
        action:$scope.orderRepeatBack
      }];
      if (ord.isArchive()) {
          $scope.actions.push({
            title:'Удалить',
            action:$scope.orderRemove
          });
      }
      if (ord.canCancel()) {
        $scope.actions.push({
          title:'Отменить',
          action:$scope.orderCancel
        });
      }
      $scope.action_arg = ord;
      $scope.popover.show($event);
    };

    $scope.closePopover = function() {
      $scope.popover.hide();
    };
    //Cleanup the popover when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.popover.remove();
    });
    // Execute action on hide popover
    $scope.$on('popover.hidden', function() {
      // Execute action
    });
    // Execute action on remove popover
    $scope.$on('popover.removed', function() {
      // Execute action
    });

    $scope.loading = true;
    $scope.user.ordersDefer.promise
      .then(function() {
        console.log(user.curOrders)
        $scope.loading = false;
      });
    $scope.user = user;
    console.log(user.arcOrders);
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('GuestCtrl', GuestCtrl);


  function GuestCtrl(Config, $scope, $rootScope, $state, $ionicLoading, $timeout, $localStorage, toast, pinRes, geolocationRes, userRes, orderRes, Order, user, app) {
    $timeout(function() {
      if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();
      toast("Здравствуйте, " + (user.profile.name.title || user.profile.msisdn));
    }, Config.SPLASHSCREEN_TIMEOUT);
    user.order = user.order ? user.order : user.newOrder();
    user.profile = {};

    $scope.user = user;
    $scope.app = app;
    $scope.appVersion = window.AppVersion ? "(v{0})".format(AppVersion.version) : "";
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('ErrorCtrl', ErrorCtrl);

  function ErrorCtrl($scope, $state, $stateParams, $localStorage, app, $window, toast) {
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
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AskPrice', AskPrice);


  function AskPrice(
    Config,
    $scope,
    $rootScope,
    $state,
    $stateParams,
    $timeout,
    $ionicLoading,
    $ionicPopover,
    $ionicPopup,
    $localStorage,
    geolocationRes,
    orderRes,
    authRes,
    Addr,
    Order,
    app,
    user,
    _,
    toast,
    pinRes,
    utils) {


    app.promo.enabled = false;
    app.card = null;


    user.order = user.order || new Order();
    $ionicPopover.fromTemplateUrl('main/templates/order-form/options-popover.html', {
      scope: $scope,
      animation: 'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.optionsPopover = popover;
    });
    $scope.goBack = function() {
      $state.go('login');
    };

    $scope.showOptionsPopover = function($event) {
      $scope.optionsPopover.show($event);
    };

    $ionicPopover.fromTemplateUrl('main/templates/order-form/cards-popover.html', {
      scope: $scope,
      animation: 'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.cardsPopover = popover;
    });

    $scope.showCardsPopover = function($event) {
      $scope.cardsPopover.show($event);
    };

    $scope.reportEvent = function(e) {
      console.log(e);
    };
    $scope._ = _;
    $scope.order = user.order;
    $scope.user = user;
    $scope.app = app;

    $scope.utils = utils;

    $scope.loadingCost = false;

    $scope.gotoTwnSelect = function() {
      $state.go('^.townSelect');
    };

    $scope.state = {
      tel: true,
      urgentShow: user.order.trf && user.order.trf.level == 5,
      urgent: false,
      urgentCost: null,
      urgentTime: null
    };

    app.getTrfs().then(function(res) {
      console.log('start get cost');
      res.forEach(function(t) {
        if ((t.desc || t.name) == 'Комфортно') {
          t.desc = 'Комфорт';
        }
      });
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
      $scope.loadingCost = true;
      user.order.getCost()
        .then(function() {
          $scope.loadingCost = false;
        }).catch(function() {
          $scope.loadingCost = false;
        });
    });

    $scope.trfChange = function(trf) {
      console.log(trf);
      var notify = [];
      if (trf.mincost) {
        notify.push('от ' + trf.mincost + ' рублей');
      }
      if (trf.time) {
        var tmend = trf.time.split('-')[1] ? trf.time.split('-')[1] : trf.time;
        notify.push('через ' + trf.time + ' ' + utils.declOfNum(tmend, ['минуа', 'минуты', 'минут']));
      }
      notify = notify.join(', ');
      notify = trf.name ? (trf.name + ': ' + notify) : notify;
      toast(notify);
      var id = trf.id;
      user.order.trf = id;
      setActiveOptions();
      $scope.loadingCost = true;
      user.order.getCost()
        .then(function() {
          $scope.loadingCost = false;
        }).catch(function() {
          $scope.loadingCost = false;
        });
    };

    $scope.login = function() {
      $ionicPopup.show({
        template: '<div class="login">\
                        <label class="item item-input item-floating-label phonenumber">\
                          <i class="material-icons placeholder-icon">&#xE0CD;</i>\
                          <input type="tel" ng-focus="user.lgn ? true : user.lgn=\'+7 (\'" autocomplete="off" ng-model="user.lgn" input-mask/>\
                        </label>\
                      </div>',
        title: 'Введите номер телефона',
        scope: $scope,
        buttons: [{
          type: 'button-clear',
          text: 'Отмена'
        }, {
          type: 'button-clear button-ok',
          text: 'Далее',
          onTap: function(e) {
            if ($scope.user.lgn) {
              $scope.getPin({
                sms: true
              });
              $scope.promtPin();
            } else {
              e.preventDefault();
              toast('Введите корректный номер телефона');
            }

          }
        }]
      }).then(function(popup) {
        $scope.townsPopup = popup;
      });
    };
    $scope.promtPin = function() {
      $scope.pinPopup = $ionicPopup.show({
        template: '<div class="login">\
                        <label class="item item-input item-floating-label phonenumber">\
                          <i class="material-icons placeholder-icon">&#xE0CD;</i>\
                          <input type=password autocomplete="off" placeholder="ПАРОЛЬ/ПИН-КОД" ng-model="user.pin" />\
                        </label>\
                      </div>',
        title: 'Введите номер телефона',
        scope: $scope,
        buttons: [{
          type: 'button-clear',
          text: 'Отмена'
        }, {
          type: 'button-clear button-ok',
          text: 'Пин не пришел',
          onTap: function(e) {
            e.preventDefault();
            $scope.getPin({
              sms: false
            });
          }
        }, {
          type: 'button-clear button-ok',
          text: 'Далее',
          onTap: function(e) {
            e.preventDefault();
            $scope.doLogin()
          }
        }]
      });
    };


    $scope.getPin = function(opts) {
      // запрос ПИН кода
      user.error = false;
      $ionicLoading.show();
      var sms = opts ? !!opts.sms : Config.SMS_PIN
      pinRes.save({
        tel: $scope.user.canonicalPhone(),
        sms: sms
      }).$promise.then(function(res) {
        // OK
        $scope.user.authMethod = "pin";
        if (Config.ENV.DEBUG) {
          toast(res.details);
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
      var authMethod = $scope.user.authMethod;
      if ($scope.user.pin.length > 4) {
        authMethod = 'password';
      }
      authRes.save({
        login: $scope.user.canonicalPhone(),
        secret: $scope.user.pin,
        method: authMethod
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
      console.log($scope.pinPopup)
      if ($scope.pinPopup) {
        $scope.pinPopup.close();
      }
      $state.go("app.main", null, {
        reload: true
      });
    };

    $scope.gotoAdvance = function() {
      $state.go("^.orderAdvance");
      $scope.optionsPopover.hide();
    };

    $scope.clearOptions = function() {
      user.order.options = [];
      setActiveOptions();
      $scope.optionsPopover.hide();
    };

    $scope.clearPromo = function() {
      app.promo.enabled = false;
      app.card = null;
      $scope.cardsPopover.hide();
    };
    $scope.activeOptions = [];

    $scope.deviceWidth = window.screen.width;

    var setActiveOptions = function() {
      return app.getOpts(user.order.trf ? user.order.trf.id : null).then(function(opts) {
        return user.order.reduceOptions().then(function(res) {
          console.log(opts, res);
          $scope.activeOptions = _.filter(opts, function(i) {
            return _.contains(res, i.name);
          });
        });
      });
    };
    setActiveOptions();


  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AppCtrl', AppCtrl);


  function AppCtrl(Config, $scope, $rootScope, $state, $ionicLoading, $timeout, $localStorage, toast, pinRes, geolocationRes, userRes, orderRes, Order, user, app) {
    $timeout(function() {
      if (window.navigator && window.navigator.splashscreen) navigator.splashscreen.hide();
      toast("Здравствуйте, " + (user.profile.name.title || user.profile.msisdn));
    }, Config.SPLASHSCREEN_TIMEOUT);
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
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrMapController', AddrMapController);


  function AddrMapController($scope, $state, $stateParams, app, user, _, Addr, geolocationRes, Config) {

    console.log(app.twn_id);
    $scope.id = $stateParams.id;
    $scope.map = {
      defaults: {
        center: {
          lat: Config.TOWN_CORDS[app.twn_id][0],
          lng: Config.TOWN_CORDS[app.twn_id][1],
          zoom: 12
        },
        tileLayer: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        maxZoom: 18,
        zoomControl: false
      }
    };

    $scope.markers = [];

    $scope.$on("leafletDirectiveMap.click", function(event, args) {
      console.log(args.leafletEvent.originalEvent)
      $scope.markers = [{
        lat: args.leafletEvent.latlng.lat,
        lng: args.leafletEvent.latlng.lng
      }];
      $scope.loadingAdresses = true;
      geolocationRes.get({
        lat: args.leafletEvent.latlng.lat,
        lon: args.leafletEvent.latlng.lng,
        townId: app.twn_id,
        quantity: Config.GEOLOCATION_ADDS_QUANTITY
      }).$promise.then(function(result) {
        $scope.geolocationAdds = _.map(result, function(item) {
          var addr = new Addr(item);
          // addr.set(item);
          console.log(addr)
          return addr;
        });
        $scope.loadingAdresses = false;
        $scope.geolocationAdds = $scope.geolocationAdds.length ? $scope.geolocationAdds : null;
        console.log($scope.geolocationAdds);

      });
    });

    $scope.addrSelect = function(addr) {
      user.order.adds[$stateParams.id] = new Addr(addr);
      user.order.getCost();
      $state.go("^.main");
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrHistoryCtrl', AddrHistoryCtrl);


  function AddrHistoryCtrl($scope, $state, $stateParams, app, user, _, Addr) {
    user.arcAdds.then(function(res) {
      $scope.adds = _.map(res, Addr);
    });
    $scope.addrSelect = function(addr) {
      user.order.adds[$stateParams.id] = new Addr(addr);
      $state.go("app.main");
    }
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrForm', AddrForm);


  function AddrForm($scope, $ionicPopover, $state, $stateParams, app, user, _, Addr) {

    $scope.app = app;
    // addr-popover

    $scope.sources = [{
      icon: "ion-clock",
      name: "История",
      href: "history"
    }, {
      icon: "ion-star",
      name: "Избранные",
      href: "favorites"
    }, {
      icon: "ion-location",
      name: "На карте",
      href: "map"
    }];
    $scope.gotoSelect = function(i) {
      $scope.popover.hide();
      switch (i.href) {
        case "history":
          $state.go("^.addrHistory", {
            id: $scope.popover_addr_id
          });
          break;
        case "favorites":
          $state.go("^.addrFavotites", {
            id: $scope.popover_addr_id
          });
          break;
        case "map":
          $state.go("^.addrMap", {
            id: $scope.popover_addr_id
          });
          break;
      }
    };
    $ionicPopover.fromTemplateUrl('main/templates/order-form/addr-popover.html', {
      scope: $scope,
      animation: 'am-fade-and-slide-top'
    }).then(function(popover) {
      $scope.popover = popover;
    });
    $scope.addrAddPopup = function() {
      // new Addr(addr)
      user.order.adds.splice($scope.popover_addr_id, 0, new Addr());
      $scope.addrAdd($scope.popover_addr_id);
      $scope.popover.hide();
    };
    $scope.addrRemovePopup = function() {
      console.log($scope.popover_addr_id);
      $scope.addrRemove($scope.popover_addr_id);
      $scope.popover.hide();
    };
    $scope.moveAddr = function(direction) {
      var target = $scope.popover_addr_id;
      if (direction == 'down') {
        target += 1;
      }
      user.order.swapAdds(target);
      $scope.popover.hide();
    };
    $scope.toAddressSelect = function() {
      $state.go("^.addr", {
        id: $scope.popover_addr_id,
        focus: true
      });
      $scope.popover.hide();
    };


    $scope.addrMore = function($event, addr, i) {
      $scope.canRemove = user.order.adds.length > 2;
      $scope.popover_addr_id = i;
      $scope.popover.show($event);
    };

    $scope.addrAdd = function(id) {
      $state.go("^.addr", {
        id: (id || id ===0) ? id : user.order.adds.length
      });
    };

    $scope.addrEdit = function(addr, index) {
      if (addr.type) {
        $state.go("^.addrEdit", {
          id: index
        });
      } else {
        $state.go("^.addr", {
          id: index
        });
      }
    };

    $scope.addrRemove = function(i) {
      if (i == 0 || user.order.adds.length == 2) {
        user.order.adds[i] = new Addr();
      } else {
        user.order.adds = _.reject(user.order.adds, function(item, k) {
          return k == i;
        });
      }
      $scope.loadingCost = true;
      user.order.getCost()
      .then(function() {
        $scope.loadingCost = false;
      }).catch(function() {
        $scope.loadingCost = false;
      });
    };

  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrFavotitesCtrl', AddrFavotitesCtrl);


  function AddrFavotitesCtrl($scope, $state, $stateParams, app, user, _, Addr) {
    $scope.adds = _.map(_.where(user.profile.adds, {
      twn_id: app.twn_id
    }), Addr);
    $scope.addrSelect = function(addr) {
      user.order.adds[$stateParams.id] = new Addr(addr);
      $state.go("app.main");
    }
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrEditCtrl', AddrEditCtrl);


  function AddrEditCtrl($scope, $state, $stateParams, Addr, Order, user, app) {
    var count = 0;
    console.log(user.order.adds);
    $scope.addr = user.order.adds[$stateParams.id];
    $scope.$watch("addr.hse", function(i) {
      if (count++ && $scope.addr.type != 2) {
        delete $scope.addr.adr_id;
        delete $scope.addr.lat;
        delete $scope.addr.lon;
        // console.log("addr changed", i);
      }
    });
    $scope.saveAddr = function() {
      if ($scope.addr && $scope.addr.error) delete $scope.addr.error;
      user.order.getCost();
      $state.go("^.main");
    };
    $scope.gotoAddrSelect = function() {
      $state.go("^.addr", {
        id: $stateParams.id
      });
    };
  }
})();

(function() {
  'use strict';
  angular
    .module('app.controllers')
    .controller('AddrCtrl', AddrCtrl);


  function AddrCtrl($scope, $state, $stateParams, $ionicHistory, $http, $timeout, Addr, addsRes, geolocationRes, user, app, Config) {

    $scope.id = $scope.id || $stateParams.id;

    $scope.title = $scope.id == '0' ? 'Откуда поедем' : 'Куда поедем'
    console.log($stateParams);
    $scope.focus = $stateParams.focus;
    // =====================================
    // geolocationAdds - срисок ближайших адресов
    // =====================================

    $scope.geolocationAdds = user.geolocationAdds || app.geolocationAdds || [];

    // =====================================
    // Заполнение geolocationAdds
    // =====================================

    $scope.getGeolocation = function(n) {
      n = n || Config.GEOLOCATION_ADDS_QUANTITY;
      var self = this;
      app.coordsDef.promise.then(function() {
        geolocationRes.get({
          lat: app.coords.lat,
          lon: app.coords.lon,
          townId: app.twn_id,
          quantity: n
        }).$promise.then(function(result) {
          $scope.geolocationAdds = _.map(result, function(item) {
            var addr = new Addr(item);
            // addr.set(item);
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

    // console.warn("user.profile", user.profile);

    // =====================================
    // Заполнение списока избранных адресов
    // =====================================

    // console.warn(user.profile.adds);

    if (!app.askPrice && user.profile.adds && user.profile.adds.length) {
      $scope.favoriteAdds = _.map(_.where(user.profile.adds.slice(0, Config.GEOLOCATION_ADDS_QUANTITY), {
        twn_id: app.twn_id
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
    if (!app.askPrice) {
      user.arcAdds.then(function(res) {
        // console.warn("arcAdds", res);
        $scope.historyAdds = _.map(res.slice(0, Config.GEOLOCATION_ADDS_QUANTITY), Addr);
      });
    }


    // =====================================

    $scope.sources = [{
        icon: "ion-clock",
        name: "История",
        href: "history"
      }, {
        icon: "ion-star",
        name: "Избранные",
        href: "favorites"
      },{
      	icon: "ion-location",
      	name: "На карте",
      	href: "map"
      }
    ];

    $scope.search = {
      byVoice: Config.ADDR_BY_VOICE,
      text: "",
      types: {
        "9": "Улица",
        "2": "Место"
      }
    };

    $scope.$watch("search.text", function(res, old) {
      if (res) {
        // улица/место найдены!
        if (res && res.length >= Config.SEARCH_MIN_LENGTH) {
          $scope.search.loading = true;
          // $.ajax({
          //   url: Config.ENV.API3_URL + "/addresses/search/",
          //   xhrFields: {
          //     withCredentials: true
          //   },
          //   data: {
          //     search: res,
          //     townId: app.twn_id
          //   },
          //   dataType: "json",
          //   success: function(data) {
          //     $scope.search.items = _.map(data, function(i) {
          //       return {
          //         nme: i.title,
          //         type: i.type == "street" ? 9 : 2,
          //         twn_id: i.townId
          //       }
          //     });
          //     $scope.search.loading = false;
          //     $scope.apply();
          //   },
          //   error: function(err, status) {
          //     $scope.search.loading = false;
          //     $scope.search.items = [];
          //     $scope.apply();
          //     console.error(status, err);
          //   }
          // });


          addsRes.query({
            search: res,
            townId: app.twn_id
          }).$promise.then(function(data) {
            $scope.search.items = data;
            $scope.search.loading = false;
          }, function(err, status) {
            $scope.search.loading = false;
            $scope.search.items = [];
            console.error(status, err);
          });

          // $http.get(Config.ENV.API3_URL + "/addresses/search/", {
          //     params: {
          //       search: res,
          //       limit: Config.SEARCH_ADDS_QUANTITY,
          //       townId: app.twn_id
          //     },
          //     useXDomain: true,
          //     withCredentials: true,
          //     hearders: {
          //       apikey: Config.API_KEY
          //     }
          //   })
          //   .success(function(data, status) {
          //     $scope.search.items = _.map(data, function(i) {
          //       return {
          //         nme: i.title,
          //         type: i.type == "street" ? 9 : 2,
          //         twn_id: i.townId
          //       }
          //     });
          //     $scope.search.loading = false;
          //   })
          //   .error(function(data, status) {
          //     $scope.search.loading = false;
          //     $scope.search.items = [];
          //     console.error(status, data);
          //   });
        }
      } else {
        $scope.search.items = [];
      }
    });
    $scope.selectAddr = function(a) {
      //alert("selectAddr");
      // выбор адреса из выпадающего списка
      var addr = new Addr(a);
      user.order.adds[$stateParams.id] = addr;
      if ($scope.id !== 0 && addr.next() === null) {
        user.order.getCost();
        $state.go("^.main");
      } else {
        $state.go("^.addrEdit", {
          id: $stateParams.id
        });
      }
    };
    $scope.gotoSelect = function(i) {
      switch (i.href) {
        case "history":
          $state.go("^.addrHistory", {
            id: $scope.id
          });
          break;
        case "favorites":
          $state.go("^.addrFavotites", {
            id: $scope.id
          });
          break;
        case "map":
          //событие клика ловится лефлетом
          setTimeout(function(e) {
            $state.go("^.addrMap", {
              id: $scope.id
            });
          },0);
          break;
      }
    }
    $scope.byVoice = function() {
      $scope.search.text = Config.ADDR_BY_VOICE;
      $scope.addrComplete();
    }
    $scope.addrComplete = function() {
      user.order.adds[$stateParams.id] = new Addr({
        nme: $scope.search.text || "",
        type: 2,
        twn_id: app.twn_id
      });
      $state.go("^.main");
    }
  }
})();

(function() {
  'use strict',
  angular.module('app.config', [])
  .constant('Config', {

    "API_PING_INTERVAL": 3000,
    "GEOLOCATION_TIMEOUT": 5000,
    "GEOLOCATION_ACCURACY": 100,
    "GEOLOCATION_ADDS_QUANTITY": 3,
    "ARC_ORDERS_WEEKS": 52,
    "ARC_ORDERS_LIMIT": 10,
    "API_KEY": "SbzLONyITCNZ5U98tESyyvzvRQU0Ivwo7IyoKgqKQr2AaST1yNC496We4lezLgQF",
    "SEARCH_MIN_LENGTH": 3,
    "SEARCH_ADDS_QUANTITY": 5,
    "NEED_HSE": [0, 1, 9],
    "DELTA_COST": 5,
    "AUTO_FOCUS_DELAY": 1000,
    "MINCOST_K": 0.5,
    "ORDER_UPDATE_DURATION": 10000,
    "HTTP_TIMEOUT": 151000,
    "TOAST_DELAY": 5000,
    "SMS_PIN": true,
    "ENTER_KEYCODES": [13, 84],
    "DAYS_FOR_ADVANCE_ORDER": 5,
    "ORDER_STATES_FOR_NOTIFY": [2, 3],
    "ORDER_STATE_AUDIO_NOTIFY_URL": "sound/addorder.ogg",
    "YANDEX_APP_METRIKA_ID": "140660",
    "YANDEX_APP_METRIKA_KEY": "62bb12e2-5352-45f2-9bec-10e370c1a780",
    "BACK_BUTTON_COUNT": 0,
    "BACK_BUTTON_COUNT_TIMEOUT": 1000,
    "HISTORY_ORDER_REMOVE_TIMEOUT": 2000,

    "TOWN_CORDS":{
      '3': [61.66910497, 50.83443934], //сыктывкар
      '21': [63.567321, 53.7471594], //ухта
      '461': [68.9585244, 33.0826598], //мурманск
      '81': [65.9991694, 57.5243292], //усинск
      '101': [65.1383492, 57.1903905], //печора
      '141': [66.0395096, 60.1307413], //инта
      '324': [67.4968967, 64.0602175], //воркута
      '181': [59.9342802, 30.3350986], //спб
      '420': [61.0722461, 50.0645454], //визинга
    },
    "TARIFF_ICONS": {
      1: "ca-tcheap",
      2: "ca-tfast",
      3: "ca-turgent",
      4: "ca-tcomfort",
      5: "ca-turgent"
    },
    "OPTION_ICONS": {
      "smoke": "ca-ismoke",
      "nosmoke": "ca-nosmoke",
      "bag": "ca-bagage",
      "largeBag": "ca-bheavy",
      "babyFix": "ca-kreslo",
      "pet": "ca-animals",
      "cash5000": "ca-k5000",
      "cash1000": "ca-k5000",
      "conditioner": "ca-climat",
      "noshanson": "ca-noshanson",
      "ticket": "ca-ticketw",
      "gntldrving": "ion-social-github",
      "silentdrv": "ion-volume-mute",
      "reservation": "ion-clock"
    },

    "TWN_ID_DEFAULT": 181,
    "AVERAGE_SPEED": 40, // средняя скорость в км/ч
    "SAMPLE_ADDS": [{
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
    }],
    "NO_WTD_COST_ERR_MSG": "Данные недоступны",
    "SPLASHSCREEN_TIMEOUT": 1000,
    "ADDR_BY_VOICE": "Объясню водителю",
    "OPERATOR_PHONE": "+78212242424",
    "SUPPORT_PHONE": "+79042002121",

    "MIN_CARD_STAY": 1,
    "CARD_EDIT_TIMEOUT": 500,
    "CARD_TYPES": {
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
    },


    // gulp environment: injects environment vars
    ENV: {
      /*inject-env*/

      'DEBUG': false,
    'API_URL': 'http://api.taxi21.ru/v1',
    'API3_URL': 'http://api.customer.taxi21.ru',
    'ARC_ORDERS_UPDATE_DURATION': 60000,
    'CUR_ORDERS_UPDATE_DURATION': 30000

      /*endinject*/
    },

    // gulp build-vars: injects build vars
    BUILD: {
      /*inject-build*/
      /*endinject*/
    }

  });
})();

'use strict';
// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'






var TARIFFS;

function declOfNum(number, titles) {
  // русские окончания числительных [1, 2..4, 5..0]
  var cases = [2, 0, 1, 1, 1, 2];
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
} catch (err) {

}
//'app.controllers', 'app.directives', 'app.providers'
angular.module('app', ['ionic','ngCordova','leaflet-directive', 'app.directives', 'app.providers','app.controllers','app.config'])

.run(function($ionicPlatform, apiRes, $state, $ionicHistory, toast, mediaSrv, app, Config) {
    console.info('Start app with config',Config);
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
      if (Config.ENV.DEBUG) {
        console.info("resolve DEVICE READY");
        app.deviceready.resolve();
      } else {
        document.addEventListener("deviceready", app.deviceready.resolve, false);
        setTimeout(app.deviceready.resolve, 5000);
      }
      if (window.plugins && window.plugins.appMetrica) {
        window.plugins.appMetrica.activate(Config.YANDEX_APP_METRIKA_KEY);
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
      }, Config.API_PING_INTERVAL);
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
        if (
          cordova &&
          cordova.plugins &&
          cordova.plugins.Keyboard &&
          cordova.plugins.Keyboard.isVisible) {
          return cordova.plugins.Keyboard.close();
        }

        if ($state.is("app.main") || $state.is("error") || $state.is("login")) {
          // выход
          // требуем двойного нажатия
          if (Config.BACK_BUTTON_COUNT >= 1) {
            navigator.app.exitApp();
          } else {
            toast("Для выхода из приложения дважды нажмите кнопку „Назад“");
            Config.BACK_BUTTON_COUNT++;
            // через 1сек сбрасываем Config.BACK_BUTTON_COUNT
            setTimeout(function() {
              Config.BACK_BUTTON_COUNT = 0;
            }, Config.BACK_BUTTON_COUNT_TIMEOUT);
          }
        } else {
          navigator.app.backHistory();
        };
      }, 300);
    });
  })
  .config(function($stateProvider, $urlRouterProvider, Config) {
    $stateProvider
      .state('login', {
        url: "/login",
        templateUrl: "main/templates/login.html",
        controller: 'LoginCtrl',
        onEnter: function() {
          if (window.navigator && navigator.splashscreen) {
            console.info("HIDE SPLASH");
            navigator.splashscreen.hide();
          }
        },
      })
      //гостевой доступ
      .state('guest', {
        url: "/guest",
        controller: "GuestCtrl",
        templateUrl: "main/templates/guest/main.html",
        abstract: true,
        onEnter: function($state,$ionicNavBarDelegate, $rootScope, $localStorage, $ionicLoading, app, user) {
          app.askPrice = true;
        },
        onExit: function($ionicNavBarDelegate, $rootScope, app) {
          app.askPrice = false;
        },
      })
      .state('guest.main', {
        url: "/askPrice",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/guest/askPrice.html",
            controller: 'AskPrice',
          }
        },
        onEnter: function() {
          if (window.navigator && navigator.splashscreen) {
            console.info("HIDE SPLASH");
            navigator.splashscreen.hide();
          }
        },
      })
      .state('guest.townSelect', {
        url: "/townSelect",
        views: {
          "menuContent": {
            controller: 'TownSelectCtrl',
            templateUrl: "main/templates/townSelect.html",
          }
        },
        cache: false,
        onEnter: function(app) {
          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
          app.card = null;
        }
      })
      .state('guest.addr', {
        url: "/addr/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrSelect.html",
            controller: 'AddrCtrl',
          }
        },
        params: {
          focus: false
        }
      })
      .state('guest.addrMap', {
        url: "/addr/:id/select/map",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrMap.html",
            controller: 'AddrMapController'
          }
        }
      })
      .state('guest.addrEdit', {
        url: "/addr/edit/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrEdit.html",
            controller: 'AddrEditCtrl'
          }
        }
      })
      .state('guest.orderAdvance', {
        url: "/order/advance",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/orderAdvance.html",
            controller: 'OrderAdvanceCtrl'
          }
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
        templateUrl: "main/templates/error.html",
        controller: 'ErrorCtrl',
        cache: false,
        onEnter: function() {
          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
        }
      })
      .state("app", {
        url: "",
        abstract: true,
        templateUrl: "main/templates/menu.html",
        controller: "AppCtrl",
        onEnter: function(geolocationRes, app, Addr) {
          console.info("state: app -> onEnter");
          var n = n || Config.GEOLOCATION_ADDS_QUANTITY;
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
                  console.info("state: app -> resolve -> login -> _tariffs");
                  app.getTwn().then(function(twn) {
                    console.info("state: app -> resolve -> login -> getTwn");
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
                          $state.go("app.townSelect");
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
                        $state.go("app.townSelect");
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
        onEnter: function($state,$ionicNavBarDelegate, $rootScope, $localStorage, $ionicLoading, app, user) {

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
            templateUrl: "main/templates/main.html",
            controller: 'MainCtrl'
          }
        }
      })
      .state('app.townSelect', {
        url: "/townSelect",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/townSelect.html",
            controller: 'TownSelectCtrl'
          }
        },
        onEnter: function(app) {

          if (window.navigator && navigator.splashscreen) navigator.splashscreen.hide();
          app.card = null;
        }
      })
      .state('app.addr', {
        url: "/addr/:id",
        cache: false,
        params: {
            focus: false
        },
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrSelect.html",
            controller: 'AddrCtrl'
          }
        }
      })
      .state('app.addrEdit', {
        url: "/addr/edit/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrEdit.html",
            controller: 'AddrEditCtrl'
          }
        }
      })
      .state('app.addrHistory', {
        url: "/addr/:id/select/history",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrHistory.html",
            controller: 'AddrHistoryCtrl'
          }
        }
      })
      .state('app.addrFavotites', {
        url: "/addr/:id/select/favorites",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrFavorites.html",
            controller: 'AddrFavotitesCtrl'
          }
        }
      })
      .state('app.addrMap', {
        url: "/addr/:id/select/map",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrMap.html",
            controller: 'AddrMapController'
          }
        }
      })
      .state('app.addrSelect', {
        url: "/addr/select/:type",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/addrSelect.html",
            controller: 'AddrCtrl'
          }
        }
      })
      .state('app.orderAdvance', {
        url: "/order/advance",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/orderAdvance.html",
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
            templateUrl: "main/templates/orderCards.html",
            controller: 'OrderCardsCtrl'
          }
        }
      })
      .state('app.orderCard', {
        url: "/order/card/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/OrderCardInfo.html",
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
            templateUrl: "main/templates/orderPromo.html",
            controller: 'OrderPromoCtrl'
          }
        }
      })
      .state('app.orderState', {
        url: "/order/:id",
        cache: false,
        views: {
          "menuContent": {
            templateUrl: "main/templates/orderState.html",
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
            templateUrl: "main/templates/orderHistory.html",
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
  .config(["$httpProvider",'Config', function($httpProvider,Config) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.timeout = Config.HTTP_TIMEOUT;
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.headers.common.Apikey = Config.API_KEY;
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
  }])
  .config(["$resourceProvider",'Config', function($resourceProvider,Config) {
    $resourceProvider.defaults.stripTrailingSlashes = false;
    $resourceProvider.defaults.timeout = Config.HTTP_TIMEOUT;
  }])
  .config(["$ionicConfigProvider",'Config', function($ionicConfigProvider,Config) {
    $ionicConfigProvider.views.transition("none");
    $ionicConfigProvider.views.maxCache(10);
    $ionicConfigProvider.views.forwardCache(true);
  }])
  .config(["toastProvider",'Config', function(toastProvider,Config) {
    toastProvider.timeout = Config.TOAST_DELAY;
  }]);
