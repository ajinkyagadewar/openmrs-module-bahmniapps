angular.module('bahmni.common.conceptSet')
    .controller('ConceptSetGroupController', ['$scope', 'appService', 'contextChangeHandler', 'spinner',
        'conceptSetService', '$rootScope', 'sessionService', 'encounterService', 'treatmentConfig', 'messagingService',
        'retrospectiveEntryService', 'userService', 'conceptSetUiConfigService', '$timeout',
        function ($scope, appService, contextChangeHandler, spinner, conceptSetService, $rootScope, sessionService, encounterService, treatmentConfig, messagingService, retrospectiveEntryService, userService, conceptSetUiConfigService, $timeout) {

            var conceptSetUIConfig = conceptSetUiConfigService.getConfig();
            $scope.togglePref = function (conceptSet, conceptName) {
                $rootScope.currentUser.toggleFavoriteObsTemplate(conceptName);
                spinner.forPromise(userService.savePreferences());
            };

            $scope.validationHandler = new Bahmni.ConceptSet.ConceptSetGroupValidationHandler($scope.conceptSets);

            $scope.getNormalized = function (conceptName) {
                return conceptName.replace(/['\.\s\(\)\/,\\]+/g, "_");
            };

            $scope.showPreviousButton = function(conceptSetName) {
                return conceptSetUIConfig[conceptSetName] && conceptSetUIConfig[conceptSetName].showPreviousButton;
            };

            $scope.showPrevious = function(){
                event.stopPropagation();
                $timeout(function() {
                    $scope.$broadcast('event:showPrevious');
                });
            };

            $scope.computeField = function (conceptSet) {
                event.stopPropagation();
                $scope.consultation.saveHandler.fire();
                var encounterData = new Bahmni.Clinical.EncounterTransactionMapper().map(angular.copy($scope.consultation), $scope.patient, sessionService.getLoginLocationUuid(),
                    retrospectiveEntryService.getRetrospectiveEntry());
                encounterData = encounterService.buildEncounter(encounterData);
                encounterData.drugOrders = [];

                var conceptSetData = {name: conceptSet.conceptName, uuid: conceptSet.uuid};
                var data = {bahmniEncounterTransaction: encounterData, conceptSetData: conceptSetData};

                spinner.forPromise(conceptSetService.getComputedValue(data)).then(function (response) {
                    response = response.data;
                    copyValues($scope.consultation.observations, response.observations);
                    var drugOrderAppConfig = appService.getAppDescriptor().getConfigValue("drugOrder") || {};
                    $scope.consultation.newlyAddedTreatments = $scope.consultation.newlyAddedTreatments || [];
                    response.drugOrders.forEach(function (drugOrder) {
                        $scope.consultation.newlyAddedTreatments.push(Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, drugOrderAppConfig, treatmentConfig));
                    });
                });
            };
            var copyValues = function (existingObservations, modifiedObservations) {
                existingObservations.forEach(function (observation, index) {
                    var correspondingModifiedObservation = _.find(modifiedObservations, function (modifiedObservation) {
                        return modifiedObservation.concept.uuid === observation.concept.uuid;

                    });
                    if (observation.groupMembers && observation.groupMembers.length > 0) {
                        copyValues(observation.groupMembers, correspondingModifiedObservation.groupMembers);
                    } else {
                        observation.value = modifiedObservations[index].value;
                    }
                });
            };

            contextChangeHandler.add($scope.validationHandler.validate);
        }])
    .directive('conceptSetGroup', function () {
        return {
            restrict: 'EA',
            scope: {
                conceptSetGroupExtensionId: "=",
                observations: "=",
                allTemplates: "=",
                context: "=",
                autoScrollEnabled: "=",
                patient: "=",
                consultation: "="

            },
            controller: 'ConceptSetGroupController',
            templateUrl: '../common/concept-set/views/conceptSetGroup.html'

        }
    });