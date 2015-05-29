/*global angular*/
(function() {
    "use strict";

    var app = angular.module('myApp', ['ng-admin']);

    app.controller('main', function($scope, $rootScope, $location) {
        $rootScope.$on('$stateChangeSuccess', function() {
            $scope.displayBanner = $location.$$path === '/dashboard';
        });
    });

    app.config(function(NgAdminConfigurationProvider, RestangularProvider) {
        var nga = NgAdminConfigurationProvider;

        function truncate(value) {
            if (!value) {
                return '';
            }

            return value.length > 50 ? value.substr(0, 50) + '...' : value;
        }

        // trim "frontend:" prefix
        function trim(value) {
            if (value.indexOf('frontend:') === -1) return value;
            return value.slice(9);
        }

        // join backends with ","
        function join(value) {
            if (typeof value === 'string') return value;
            return value.join(', ');
        }

        // use the custom query parameters function to format the API request correctly
        RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params) {
            if (operation == "getList") {
                // custom pagination params
                if (params._page) {
                    params._start = (params._page - 1) * params._perPage;
                    params._end = params._page * params._perPage;
                }
                delete params._page;
                delete params._perPage;
                // custom sort params
                if (params._sortField) {
                    params._sort = params._sortField;
                    delete params._sortField;
                }
                // custom filters
                if (params._filters) {
                    for (var filter in params._filters) {
                        params[filter] = params._filters[filter];
                    }
                    delete params._filters;
                }
            }
            return {
                params: params
            };
        });

        var admin = nga.application('Hipache Console')
            .baseApiUrl('http://localhost:3000/');

        var app = nga.entity('app');

        admin.addEntity(app);

        app.dashboardView()
            .title('Recent apps')
            .order(1)
            .perPage(5)
            .fields([nga.field('frontend').isDetailLink(true).map(trim)]);

        app.listView()
            .title('All apps')
            .description('List of apps with infinite pagination')
            .fields([
                nga.field('frontend').label('Frontend').map(trim),
                nga.field('backends').label('Backends').map(join),
            ])
            .listActions(['show', 'edit', 'delete']);

        app.creationView()
            .fields([
                nga.field('frontend').map(trim),
                nga.field('backends').map(join),
            ]);

        app.editionView()
            .title('Edit application "{{ entry.values.frontend }}"')
            .actions(['list', 'show', 'delete'])
            .fields([
                app.creationView().fields(),
            ]);

        app.showView()
            .fields([
                app.editionView().fields(),
            ]);

        nga.configure(admin);
    });
}());
