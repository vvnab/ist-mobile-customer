angular.module('app.filters', ['ngStorage']).filter('removedOrders', function($localStorage, _) {
  return function(orders) {
    return _.filter(orders, function(order) {
      return !_.include($localStorage.removedOrders, order.id);
    });
  };
});
