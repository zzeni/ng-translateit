describe('TranslationsController', function() {
  beforeEach(module('ng-translateit'));

  var $controller;
  var $scope = {};

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
    $controller('translationsController', { $scope: $scope });
  }));

  describe('logout', function() {
    describe('when success', function() {
      it('sets the isLogged flag to false and alerts a success notice', function() {
        $scope.loggedIn = true;
        $scope.logout();
        expect($scope.loggedIn).toEqual(false);
        expect($scope.alerts.length).toEqual(1);
        expect($scope.alerts[0]).toEqual({msg: "", type: "success"});
      });
    });
  });
});
