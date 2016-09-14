angular.module('app.resources', ['ngResource'])

.factory('mediaSrv', function($q, $ionicPlatform, $window) {
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
          src = '/android_asset/www/' + src;
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
  .factory("authRes", function($resource, $q, toast) {
    return $resource(API3_URL + "/auth/", null, {
      get: {
        method: "GET",
        timeout: HTTP_TIMEOUT
      }
    });
  })
  .factory("userRes", function($resource, $q, toast) {
    return $resource(API3_URL + "/user/", null, {
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
  .factory("pinRes", function($resource, dataTransform) {
    return $resource(API3_URL + "/auth/pin/", null, {
      save: {
        method: "POST",
        timeout: HTTP_TIMEOUT,
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
  .factory("tariffsRes", function($resource) {
    return $resource(API3_URL + "/tariffs/", null, {
      get: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
        isArray: false
      }
    });
  })
  .factory("costRes", function($resource, dataTransform) {
    return $resource(API3_URL + "/orders/rater/", null, {
      get: {
        method: "POST",
        timeout: HTTP_TIMEOUT,
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
  .factory("orderRes", function($resource, $localStorage, dataTransform) {
    return $resource(API3_URL + "/orders/:id/", {
      id: "@id",
      limit: ARC_ORDERS_LIMIT + ($localStorage.removedOrders ? $localStorage.removedOrders.length : 0)
    }, {
      query: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
        isArray: true,
        transformResponse: function(data) {
          data = JSON.parse(data);
          return _.map(data, dataTransform.order);
        }
      },
      getOne: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
        transformResponse: function(data) {
          data = JSON.parse(data);
          console.warn("ORIGINAL", data);
          data = dataTransform.orderOne(data);
          console.warn("TRANSFORMED", data);
          return data;
        }
      },
      save: {
        method: "POST",
        timeout: HTTP_TIMEOUT,
        transformRequest: function(data) {
          data = dataTransform.orderReverse(data);
          data = JSON.stringify(data);
          return data;
        }
      }
    });
  })
  .factory("arcAddsRes", function($resource) {
    return $resource(API_URL + "/AddsHistory/", {
      weeks: ARC_ORDERS_WEEKS
    });
  })
  .factory("addsRes", function($resource, dataTransform) {
    return $resource(API3_URL + "/addresses/search/", {
      limit: SEARCH_ADDS_QUANTITY
    }, {
      query: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
        isArray: true,
        transformResponse: function(data) {
          data = JSON.parse(data);
          data = _.map(data, dataTransform.addr);
          return data;
        }
      }
    });
  })
  .factory("locationRes", function($resource) {
    return $resource(API3_URL + "/addresses/location");
  })
  .factory("geolocationRes", function($resource, dataTransform) {
    return $resource(API3_URL + "/addresses/reverseGeolocation/", {
      distance: GEOLOCATION_ACCURACY
    }, {
      get: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
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
  .factory("apiRes", function($resource) {
    return $resource(API3_URL + "/v1/", null, {
      get: {
        method: "GET",
        timeout: HTTP_TIMEOUT,
        isArray: false
      }
    });
  });
