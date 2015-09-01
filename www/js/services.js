angular.module('app.services', ['ngResource'])

.factory('_', function() {
  return window._; // assumes underscore has already been loaded on the page
})
.factory('moment', function() {
  return window.moment; // assumes underscore has already been loaded on the page
})
.factory("app", function($state, $localStorage, $q, twnRes, trfRes, optRes, locationRes, _, toast) {

	var app = {
		init: function() {
			app.twns_ = twnRes.get({rem: "true"});
			app.trfs_ = trfRes.get();
			app.opts_ = optRes.get();
		},
		twns_: twnRes.get({rem: "true"}),
		trfs_: trfRes.get(),
		opts_: optRes.get(),
		tel: OPERATOR_PHONE,
		twn_id: $localStorage.twn_id,
		twns: [],
		get twn_nme() {
			var twn = _.findWhere(app.twns, {id: app.twn_id});
			return twn ? twn.nme : null;
		},
		menu: [
			{
				get title() {
					return app.twn_nme;
				},
				icon: "earth",
				action: function() {
					$state.go("townSelect");
				},
			},
			{
				title: "Новый заказ",
				icon: "model-s",
				action: function() {
					$state.go("app.main");
				},
			},
			{
				title: "История заказов",
				icon: "clock",
				action: function() {
					$state.go("app.orderHistory");
				},
				badgeClass: "energized",
				get badge() {
					return app.curOrders;
				}
			},
			{
				title: "Звонок оператору",
				icon: "ios-telephone",
				href: function() {
					return "tel:" + app.tel;
				}
			},
			{
				title: "Смена аккаунта",
				icon: "log-out",
				action: function() {
					$state.go("login");
				},
			}
		],
		getTwn: function(twn_id) {
			return $q(function(resolve, reject) {
				app.twns_.$promise.then(function(res) {
					app.twns = res;
					if (twn_id) {
						resolve(_.findWhere(res, {id: twn_id}));
						return;
					}
					console.log('Towns_res: ' + JSON.stringify(res));
					navigator.geolocation.getCurrentPosition(function(res) {
						console.log('geolocation: ' + JSON.stringify(res));
					    app.coords = {
					      	lat: res.coords.latitude,
					      	lon: res.coords.longitude
					    };
					    locationRes.get({
					      	lat: app.coords.lat,
					      	lon: app.coords.lon
					    }).$promise.then(
					      	function(location) {
					        	var city = location.address.city || location.address.town;
					        	var twn = _.findWhere(app.twns, {nme: city});
					        	console.log('Town: ' + JSON.stringify(twn));
					        	resolve(twn);
					      	}
					    );
					}, function(err) {
						console.log('Geolocation ERROR: ' + JSON.stringify(err));
					}, {maximumAge: 3600000, timeout: 5000, enableHighAccuracy: false});
				});
			});
		},
		getTrfs: function(twn_id) {
			// возвращает Promise списка тарифов
			var self = this;
			if(!twn_id) {
				twn_id = self.twn_id;
			}
			return $q(function(resolve, reject) {
				self.getTwn(twn_id).then(function(twn) {
					self.twn_id = twn.id;
					self.trfs_.$promise.then(function(res) {
						var twn = _.findWhere(res, {twn_id: app.twn_id});
						self.tel = twn ? twn.tel || OPERATOR_PHONE : OPERATOR_PHONE;
						var tariffs = twn ? twn.trfs : null;
						tariffs = _.sortBy(_.map(tariffs, function(i, k) {
							return {
								id: k + 1,
								level: i.level,
								mincost: i.mincost,
								time: i.time,
								icon: TARIFF_ICONS[i.level],
								srv_ids: i.srv_ids,
								name: i.nme,
								desc: i.desc,
								options: i.options,
								default: i.default || false
							};
						}), 'level');
						resolve(tariffs);
					});
				});
			});
		},
		getDefaultTrf: function(twn_id) {
			var self = this;
			return self.getTrfs(twn_id).then(function(res) {
				return _.findWhere(res, {default: true});
			});
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
						self.opts_.$promise.then(function(options) {
							var result = _.filter(options, function(i) {
								return _.contains(_.findWhere(tariffs, {id: trf_id}).options, i.name); 
							});
							_.forEach(result, function(i) {
								i.icon = OPTION_ICONS[i.name];
							});
							resolve(result);
						});
					});
				});
			}
		}
	};
	app.twns_.$promise.then(function(res) {
		app.twns = res;
	});
	return app;
})
.service("user", function($interval, Addr, Order, orderRes, arcAddsRes, _, app) {
    return {
        profile: null,
        arcOrders: null,
        curOrders: null,
        twn: null,
        historyUpdateFlag: true,
        canonicalPhone: function(tel) {
            if (!tel) {
                var tel = this.lgn;
            }
            return tel.replace(/\D/g, "").replace(/^7|^8/, "").slice(-10);
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
        	self.arcAdds = arcAddsRes.query({twn_id: app.twn_id}).$promise;
        	return self.arcAdds;
        },
        historyUpdate: function() {
        	var self = this;
        	return orderRes.query().$promise.then(function(result) {
        		var orderGroup = _.groupBy(result, function(order) {
        			return order.st == 70 ? "arc": "cur"
        		});
        		self.curOrders = _.map(orderGroup.cur, Order);
        		self.arcOrders = _.map(orderGroup.arc, Order);
        		app.curOrders = self.curOrders.length;
        	});
        },
	    periodicHistoryUpdate: function() {
	    	var self = this;
	    	self.interval = $interval(function(){
	    		if (self.historyUpdateFlag) self.historyUpdate();
	    	}, ARC_ORDERS_UPDATE_DURATION);
	    }
    }
})
.factory("Addr", ["_", function(_) {
	return function(addr) {
		if (!addr) {
			var addr = {};
		}
		return {
			type: parseInt(addr.type) || 0,
			adr: addr.adr || addr.nme || "",
			hse: addr.hse || "",
			ent: addr.ent || "",
			twn_id: addr.twn_id || 3,
			srt: 0,
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
				return this.ent.search(/\D+/) + 1 ? this.ent : "{0}-й подъезд".format(this.ent) ;
			}
		}
	}
}])
.factory("Order", function($q, _, moment, app, Addr, costRes, orderRes, toast, mediaSrv) {
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
			id: order.id,
			type: 0,
			cost: order.cost || null,
			tme_reg: order.tme_reg || null,
			tme_wtd: order.tme_wtd || null,
			tme_exe: order.tme_exe || null,
			tme_brd: order.tme_brd || null,
			tme_drv: order.tme_drv || null,
			wtd_cost: order.wtd_cost || null,
			options: order.options || [],
			adds: order.adds ? _.map(order.adds, function(addr) {
				return new Addr(addr);
			}) : [new Addr(), new Addr()],
			get complete() {
				return _.reduce(this.adds, function(s, i, k) {
					return s && !i.next(k == 0);
				}, true) && this.adds.length >= 2;
			},
			get canAdd() {
				return this.adds.length ?_.reduce(this.adds, function(s, i, k) {
					return s && !i.next(k == 0);
				}, true) : false;
			},
			canCancel: function() {
				return _.contains(["search", "found", "en route", "arrived", "advance"], this.states[this.state] || 0);
			},
			getOrderTme: function() {
				var localTime = moment(this.tme_reg) + parseInt(this.tme_reg_period) * 1000;
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
				toast('tme: ' + JSON.stringify(tme));
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
				var text = "";
				switch (this.states[this.state]) {
					case "search":
						text = "<div class='info'>Поиск автомобиля...</div>";
						break;
					case "found":
						text = "<div class='info'>Поиск автомобиля...</div>";
						//text = "<div class='auto'>{0}</div>".format(this.auto_rem);
						break;
					case "en route":
						text = "<div class='time'>{2}</div><div class='auto'>{0}</div><div class='auto'>{1}</div>".format(this.auto, this.auto_nom, this.getTime(this.tme_wait), this.getWaitDuration());
						break;
					case "arrived":
						text = "<div class='auto'>{0}</div><div class='info'>Машина подъехала, выходите!</div>".format(this.auto_rem);
						break;
					case "cancel":
						text = "<div class='info'>Заказ отменён</div>"
						break;
					case "complete":
						text = "<div class='info'>Заказ выполнен</div>"
						break;
					case "in car":
						text = "<div class='auto'>{0}</div><div class='info'>Длительность поездки:</div><div class='info'>{1}</div>".format(this.auto_rem, this.getOrderTme());
						break;
					case "advance":
						text = "<div class='info'>Предварительный заказ</div><div class='info'>{0}</div>".format(this.tme_drv);
						break;
				}
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
				this.trf_ = _.findWhere(app.trfs, {id: id});
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
					return moment.duration(this.dist_km / AVERAGE_SPEED, 'hours').minutes();//.humanize();
				} else {
					return this.trf.time;
				}
			},

			// стоимость
			getCost: function(srv_id) {
				var self = this;
				srv_id = srv_id ? srv_id : this.srv_id;
				delete self.error;
				if (this.complete) {
					var def = costRes.get({
						adrs: this.adds,
						srv_id: this.srv_id,
						need_taxom: 1,
						ord_type: this.type ? 0 : 1,
						datetime: this.tme_drv
					}).$promise;
					self.wtd_cost = null;
					self.dist_km = null;
					return def.then(function(res) {
						if (res.error) {
							throw res;
						} else {
							self.wtd_cost = res.wtd_cost;
							self.dist_km = res.dist_km;
						}
					}).catch(function(err) {
						var error = {
							code: err.data.error.split(":")[0],
							text: err.data.error.split(":")[1],
							data: err.data.error_data
						};
						// сообщение об ошибке
						if (err.data.taxom) {
							var taxom = err.data.taxom;
							var zones = taxom.geo_zones.length;
							var info = _.reduce(taxom.tariff, function(memo, val, key) {
								var res =  _.extend(memo, val);
								res.free_dst_km = _.reduce(val.zones_dist, function(memo, val, key) {
									return val.prc_km > 0 ? val.dist / 1000 : 0; 
								}, 0);
								return res;
							}, {});
							self.error = "<h4>{0}</h4><h5>таксометр :</h5><dl>\
										 <dt>стоимость посадки</dt><dd>{1} руб</dd>\
										 <dt>стоимость километра</dt><dd>{2} руб</dd>\
										 <dt>бесплатное расстояние</dt><dd>{3} км</dd></dl>"
										 .format(error.text, info.prc_brd, info.prc_dst_km, info.free_dst_km);
						} else {
							self.error = error.text;
						}
						// подсветка неверного адреса
						_.each(error.data, function(i) {
							self.adds[i].error = true;
						})
						console.error(error);
					});
				} else {
					var def = $q.defer();
					def.reject({data: {
						error: "99:Неполный маршрут!"
					}});
					return def.promise;
				}
			},
			create: function(tel) {
				delete this.id;
				this.tel = tel;
				this.type = this.type ? 1 : 0;
				var self = this;
				var req = _.clone(this);
				return self.reduceOptions().then(function(res) {
					req.options = res;
					if (DEBUG) req.srv_id = 254;
					return orderRes.save(req).$promise;
				});
			},
			delete: function() {
				return orderRes.remove({id: this.id}).$promise;
			},
			update: function() {
				var self = this;
				return orderRes.getOne({id: self.id}).$promise.then(function(res) {
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
.factory('mediaSrv', function($q, $ionicPlatform, $window){
	var service = {
		loadMedia: loadMedia,
		getStatusMessage: getStatusMessage,
		getErrorMessage: getErrorMessage
	};

	function loadMedia(src, onError, onStatus, onStop){
		var defer = $q.defer();
		$ionicPlatform.ready(function() {
		  	var mediaSuccess = function() {
		    	if(onStop){onStop();}
		  	};
		  	var mediaError = function(err){
		    	_logError(src, err);
		    	if(onError){onError(err);}
		  	};
		  	var mediaStatus = function(status){
		    	if(onStatus){onStatus(status);}
		  	};

		  	if($ionicPlatform.is('android')) {
		  		src = '/android_asset/www/' + src;
		  	}
		  	defer.resolve(new $window.Media(src, mediaSuccess, mediaError, mediaStatus));
		});
		return defer.promise;
	}

	function _logError(src, err){
		console.error('media error', {
		  	code: err.code,
		  	message: getErrorMessage(err.code)
		});
	}

function getStatusMessage(status){
	if(status === 0) {return 'Media.MEDIA_NONE';}
	else if(status === 1) {return 'Media.MEDIA_STARTING';}
	else if(status === 2) {return 'Media.MEDIA_RUNNING';}
	else if(status === 3) {return 'Media.MEDIA_PAUSED';}
	else if(status === 4) {return 'Media.MEDIA_STOPPED';}
	else {return 'Unknown status <' + status + '>';}
}

	function getErrorMessage(code){
		if(code === 1) {return 'MediaError.MEDIA_ERR_ABORTED';}
		else if(code === 2) {return 'MediaError.MEDIA_ERR_NETWORK';}
		else if(code === 3) {return 'MediaError.MEDIA_ERR_DECODE';}
		else if(code === 4) {return 'MediaError.MEDIA_ERR_NONE_SUPPORTED';}
		else {return 'Unknown code <' + code + '>';}
	}

	return service;
})
.factory("userRes", function($resource, $q, toast) {
    return $resource(API_URL + "/User/", null, { 
        get: {
            method: "GET",
            timeout: HTTP_TIMEOUT,
            interceptor: {
            	responseError: function(resp) {
            		toast("Вход не выполнен");
            		return $q.reject(resp);
            	}
            }
        }
    });
})
.factory("pinRes", function($resource, $q) {
    return $resource(API_URL + "/Pin/:pin/", {pin: "@pin"}, { 
        get: {
            method: "GET",
            timeout: HTTP_TIMEOUT
        }
    });
})
.factory("trfRes",	function($resource, $q) {
	return $resource(API_URL + "/Tariffs/", null, { 
		get: {
			method:  "GET",
			timeout: HTTP_TIMEOUT,
            interceptor: {
            	responseError: function(resp) {
            		return $q.reject(resp);
            	}
            },
			isArray: true
		}
	});
})
.factory("optRes",	function($resource, $q) {
	return $resource(API_URL + "/Options/", null, { 
		get: {
			method:  "GET",
			timeout: HTTP_TIMEOUT,
            interceptor: {
            	responseError: function(resp) {
            		return $q.reject(resp);
            	}
            },
			isArray: true
		}
	});
})
.factory("twnRes", function($resource) {
	return $resource(API_URL + "/Towns/", null, { 
		get: {
			method: "GET",
			timeout: HTTP_TIMEOUT,
			isArray: true
		}
	});
})
.factory("costRes", function($resource) {
	return $resource(API_URL + "/Rater/", null, { 
		get: {
			method: "POST",
			timeout: HTTP_TIMEOUT
		}
	});
})
.factory("orderRes", function($resource) {
    return $resource(API_URL + "/AllOrders/:id/", {id: "@id"}, { 
        getOne: {
            method: "GET",
            timeout: HTTP_TIMEOUT
        }
    });
})
.factory("arcAddsRes", function($resource) {
    return $resource(API_URL + "/AddsHistory/");
})
.factory("locationRes", function($resource) {
    return $resource(API_URL + "/ReverseLocation/");
});
