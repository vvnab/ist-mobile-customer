angular.module('app.services', ['ngResource', 'app.resources'])

.factory('_', function() {
    return window._; // assumes underscore has already been loaded on the page
  })
  .factory('moment', function() {
    return window.moment; // assumes underscore has already been loaded on the page
  })
  .factory("app", function($state, $localStorage, $ionicHistory, $ionicSideMenuDelegate, $q, dataTransform, tariffsRes, locationRes, _, toast) {

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
      tel: OPERATOR_PHONE,
      supTel: SUPPORT_PHONE,
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
          $state.go("townSelect");
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
              setTimeout(app.coordsDef.resolve, GEOLOCATION_TIMEOUT);

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
                  timeout: GEOLOCATION_TIMEOUT,
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
                  timeout: GEOLOCATION_TIMEOUT,
                  enableHighAccuracy: true
                });

              } catch(err) {
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
              self.tel = twn ? twn.tel || OPERATOR_PHONE : OPERATOR_PHONE;
              var tariffs = twn ? twn.trfs : null;
              var optionsCost = twn ? twn.optionsCost : null;
              tariffs = _.sortBy(_.map(tariffs, function(i, k) {
                return {
                  id: k + 1,
                  tariffId: i.tariffId,
                  level: i.level,
                  mincost: i.mincost,
                  time: i.time,
                  icon: TARIFF_ICONS[i.level],
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
              self.tel = twn ? twn.tel || OPERATOR_PHONE : OPERATOR_PHONE;
              var tariffs = twn ? twn.trfs : null;
              var optionsCost = twn ? twn.optionsCost : null;
              tariffs = _.sortBy(_.map(tariffs, function(i, k) {
                return {
                  id: k + 1,
                  tariffId: i.tariffId,
                  level: i.level,
                  mincost: i.mincost,
                  time: i.time,
                  icon: TARIFF_ICONS[i.level],
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
        var self = this;
        if (!trf_id) {
          return self.getDefaultTrf().then(function(trf) {
            return self.getOpts(trf.id);
          })
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
                  i.icon = OPTION_ICONS[i.name];
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
  .service("user", function($interval, $localStorage, Addr, Order, orderRes, userRes, arcAddsRes, _, app, $q) {
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
        //   return card.type == 3 ? card.bill.stay + card.bill.debt >= MIN_CARD_STAY: true;
        // });
        // =====================================================
        // преобразование карт

        var town = _.find(app._tariffs.towns, {townId: app.twn_id}) || {};

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
              card.writeOff = card.stay > MIN_CARD_STAY ? $localStorage.card.writeOff : false;
            }
            card.writeOff = card.writeOff == undefined ? false : card.writeOff;
            card.canWriteOff = card.stay > MIN_CARD_STAY;
            card.canWriteOn = card.reit > 0;
          }
          card.typeMeta = CARD_TYPES[card.type];
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
        var town = _.find(app._tariffs.towns, {townId: app.twn_id});
        card.defaultAccumCard = card.number == town.defaultAccumCard;
        card.writeOff = true;
        card.title = card.num;
        card.typeMeta = CARD_TYPES[card.type];
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
          adds = _.filter(adds, {twn_id: app.twn_id});
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
          if (self.historyUpdateFlag) self.historyUpdate();
        }, ARC_ORDERS_UPDATE_DURATION);
      }
    }
  })
  .factory("Addr", ["app", "geolocationRes", "_", function(app, geolocationRes, _) {
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
            if ((_.contains(NEED_HSE, this.type) && this.adr && this.hse && this.ent) || (!(_.contains(NEED_HSE, this.type)) && this.adr && this.ent)) {
              return null;
            } else if ((_.contains(NEED_HSE, this.type) && this.adr && this.hse) || (!(_.contains(NEED_HSE, this.type)) && this.adr)) {
              return "ent";
            } else if (_.contains(NEED_HSE, this.type) && this.adr) {
              return "hse";
            } else {
              return "adr";
            }
          } else {
            if ((_.contains(NEED_HSE, this.type) && this.adr && this.hse) || (!(_.contains(NEED_HSE, this.type)) && this.adr)) {
              return null;
            } else if (_.contains(NEED_HSE, this.type) && this.adr) {
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
              txt = isFirst ? "Откуда поедем?" : "Куда поедем?";
              break;
            case "ent":
              txt = _.contains(NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr);
              break;
            case "hse":
              txt = "{0}".format(adr);
              break;
            default:
              txt = false ? (_.contains(NEED_HSE, this.type) ? "{0} {1} ({2})".format(adr, hse, ent) : "{0} ({1})".format(adr, ent)) : (_.contains(NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr));
          }
          return this.value ? "{0} <small>({1})</small>".format(this.value, txt) : txt;
        },
        header: function() {
          var adr = this.adr ? this.adr.replace(/\(.*\)/, '') : "";
          var hse = this.hse;
          var ent = this.ent;
          return _.contains(NEED_HSE, this.type) ? "{0} {1}".format(adr, hse) : "{0}".format(adr);
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
      }
    }
  }])
  .factory("Order", function($q, _, moment, app, Addr, costRes, orderRes, toast, mediaSrv, $localStorage) {
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
        cost: order.cost || null,
        optionsSum: order.optionsSum || null,
        tme_reg: order.tme_reg || null,
        tme_wtd: order.tme_wtd || null,
        tme_exe: order.tme_exe || null,
        tme_brd: order.tme_brd || null,
        tme_drv: order.tme_drv || null,
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

          if (index == 1 && swap.adr == ADDR_BY_VOICE) return;

          this.adds[index] = this.adds[index - 1];
          this.adds[index - 1] = swap;
          this.getCost();
        },
        canCancel: function() {
          return _.contains(["search", "found", "en route", "arrived", "advance"], this.states[this.state] || 0);
        },
        getOrderTme: function() {
          var localTime = moment(this.tme_reg) + parseInt(this.tme_reg_period) * 1000;
          console.log(moment(this.tme_reg), this.tme_reg_period, localTime);
          var duration = moment.duration(localTime - moment(this.tme_brd || this.tme_wait));
          duration = duration > 0 ? duration : moment.duration(0);
          return humanizeDuration(duration);

        },
        getWaitDuration: function() {
          var localTime = moment(this.tme_reg) + this.tme_reg_period * 1000;
          var duration = moment.duration(moment(this.tme_wait) - localTime);
          duration = duration > 0 ? duration : moment.duration(0);
          return humanizeDuration(duration);
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
          addr.twn_id = TWN_ID_DEFAULT;
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
            return moment.duration(this.dist_km / AVERAGE_SPEED, 'hours').minutes(); //.humanize();
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

            self.reduceOptions().then(function(res) {
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
                  self.error = info.free_dst_km ? "<h4>{0}</h4><h5>таксометр :</h5><dl>\
  										 <dt>стоимость посадки</dt><dd>{1} &#8381;</dd>\
  										 <dt>стоимость километра</dt><dd>{2} &#8381;</dd>\
  										 <dt>бесплатное расстояние</dt><dd>{3} км</dd></dl>"
                    .format(error.text, info.prc_brd, info.prc_dst_km, info.free_dst_km) :
                    "<h4>{0}</h4><h5>таксометр :</h5><dl>\
  										 <dt>стоимость посадки</dt><dd>{1} &#8381;</dd>\
  										 <dt>стоимость километра</dt><dd>{2} &#8381;</dd>"
                    .format(error.text, info.prc_brd, info.prc_dst_km);
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
        update: function() {
          var self = this;
          return orderRes.getOne({
            id: self.id
          }).$promise.then(function(res) {
            var adds = _.map(res.adds, function(addr) {
              return new Addr(addr);
            });
            delete res.adds;
            while (self.adds.pop()) {};
            _.each(adds, function(addr) {
              self.adds.push(addr);
            });
            if (self.state != res.state && _.contains(ORDER_STATES_FOR_NOTIFY, res.state)) {
              if (window.Media) {
                mediaSrv.loadMedia(ORDER_STATE_AUDIO_NOTIFY_URL).then(function(media) {
                  media.play();
                });
              }
            }
            _.extend(self, res);
            return res;
          });
        }
      }
    }
  })
  .factory('dataTransform', function() {
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
        return {
          id: i.id,
          st: _.contains(["DONE", "CANCELED"], i.state) ? 70 : 20,
          cost: i.cost,
          twn_id: i.townId,
          tme_reg: moment(i.createdAt).format("DD MMM YYYY HH:mm"),
          adds: [
            {
              adr_id: i.addressSourceId,
              twn_id: i.townId,
              type: i.addressSourceType == "POI" ? 2 : 9,
              adr: i.addressSourceStreet,
              hse: i.addressSourceHouse,
              ent: i.addressSourceEntrance,
              lat: i.addressSourceLat,
              lon: i.addressSourceLon
            },
            {
              adr_id: i.addressDestId,
              twn_id: i.townId,
              type: i.addressDestType == "POI" ? 2 : 9,
              adr: i.addressDestStreet,
              hse: i.addressDestHouse,
              ent: i.addressDestEntrance,
              lat: i.addressDestLat,
              lon: i.addressDestLon
            }
          ]
        };
      },

      orderOne: function(i) {
        var states = {
          "OFFERED":    0,
          "REQUESTED":  1,
          "ACCEPTED":   2,
          "READY":      3,
          "CANCELED":   4,
          "STARTED":    6,
          "DONE":       5,
          "FINISHED":   7,
          "RESERVED":   8
        };

        // console.log((moment() - moment(i.createdAt)) / 1000);

        return {
          id: i.id,
          version: i.version,
          st: _.contains(["DONE", "CANCELED"], i.state) ? 70 : 20,
          state: states[i.state],
          cost: i.expectedCost,
          wtd_cost: i.expectedCost,
          pureCost: i.pureCost,
          optionsSum: i.optionsSum,
          navitaxCalc: i.navitaxCalc,
          cash: i.cash,
          tme_wait: i.waitedAt,
          twn_id: i.town.id,
          tme_reg: moment(i.createdAt),
          tme_brd: moment(i.startedAt),
          tme_wait: moment(i.waitedAt),
          tme_reg_period: Math.round((moment() - moment(i.createdAt)) / 1000),
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
        switch(i) {
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
        var result =  {
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
    }
  });
