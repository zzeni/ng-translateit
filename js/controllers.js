app.controller('translationsController', function (
  $scope,
  $localStorage,
  $sessionStorage,
  $uibModal,
  apiClient,
  config,
  TranslationFactory,
  $location
) {

  $scope.langDB = config.langDB;

  $localStorage.$default({
    changes: {},
    versions: {}
  });

  $scope.alerts = [];

  function init() {
    apiClient.getAllTranslations().then(
      function(response) {
        try {
          $scope.$tm = new TranslationFactory(response.data, $localStorage);
          $localStorage.changes = $scope.$tm.getChanges();
          $localStorage.versions = $scope.$tm.getVersions();
        }
        catch (err) {
          $scope.$emit('error', err);
          // TODO: show local storage cleanup!
          $localStorage.changes = {}
          setTimeout(function () {
            window.location.reload();
          }, 30000);
        }
      },
      function (response) {
        $scope.$emit('error', response);
      }
    );
  }

  apiClient.pingBackend().then(
    function (data) {
      $scope.$emit('connected');
      console.log('connected to server ..');
    },
    function (error) {
      console.error(error);
      document.getElementById('main-container').innerHTML = "<p>There is a problem connecting to the backend server. Please contact the website administrator.</p>";
    }
  );

  $scope.$on('connected', function (e) {
    init();
  });

  $scope.$on('error', function (event, data) {
    console.log(data)
    $scope.alerts.push({type: 'danger', msg: 'An unexpected error occured: ' + data});
  });

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  };

  $scope.showDiffModal = function showDiffModal() {

    var modalInstance = $uibModal.open({
      animation: true,
      templateUrl: 'diffModal.html',
      controller: 'diffModalController',
      size: 'lg',
      resolve: {
        $tm: function () {
          return $scope.$tm;
        }
      }
    });

    modalInstance.result.then(
      function (msg) {
        $scope.alerts.push({msg: msg, type: 'success'});
        $scope.init();
      },
      function () {
        // do nothing ..
      }
    );
  };

  $scope.editedFilter = function (entry) {
    return !$scope.editedItemsOnly || entry.changed();
  };

  $scope.blankFilter = function (entry) {
    return !$scope.blankItemsOnly || !entry.text;
  };

  $scope.languageFilter = function (entry) {
    return !$scope.selectedLanguage || (entry.path && entry.path.indexOf($scope.selectedLanguage.key) === 0);
  };

  $scope.unsavedFilter = function (entry) {
    return !$scope.unsavedItemsOnly || entry.editing;
  };
});

// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

app.controller('diffModalController', function ($scope, $rootScope, apiClient, $uibModalInstance, $tm) {
  $scope.$tm = $tm;

  $scope.options = {
    editCost: 4,
    attrs: {
      insert: {
        'data-attr': 'insert',
        'class': 'insertion'
      },
      delete: {
        'data-attr': 'delete'
      },
      equal: {
        'data-attr': 'equal'
      }
    }
  };

  $scope.revokeChange = function revokeChange(key) {
    $scope.$tm.revokeChange(key);
    if (!$scope.$tm.hasChanges()) {
      $uibModalInstance.dismiss();
    }
  };

  $scope.revokeAll = function revokeAll() {
    if (confirm("Are you sure you want to revoke ALL your changes ? This action can't be undone!")) {
      $scope.$tm.revokeAll();
      $uibModalInstance.dismiss();
    }
  };

  $scope.submit = function submit() {
    var changesCount = $scope.$tm.hasChanges();

    if (changesCount) {
      apiClient.submit($scope.$tm.changesToJson()).then(
        function (response) {
          var alertText = changesCount + ' changes successfully persisted.';
          $uibModalInstance.close(alertText);
        },
        function (response) {
          $rootScope.$broadcast('error', response.data);
        }
      );
    }
    else {
      $uibModalInstance.dismiss();
    }
  };

  $scope.cancel = function cancel() {
    $uibModalInstance.dismiss();
  };
});