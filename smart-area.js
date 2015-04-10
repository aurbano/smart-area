/**
 * AngularJS Directive to allow autocomplete and dropdown suggestions
 * on textareas.
 *
 * Homepage: https://github.com/aurbano/smart-area
 *
 * @author Alejandro U. Alvarez (http://urbanoalvarez.es)
 * @license AGPLv3 (See LICENSE)
 */

angular.module('smartArea', [])
    .directive('smartArea', function($compile) {
    return {
        restrict: 'A',
        scope: {
            areaConfig: '=smartArea',
            areaData: '=ngModel'
        },
        replace: true,
        link: function(scope, textArea, attrs){
            if(textArea[0].tagName.toLowerCase() !== 'textarea'){
                console.warn("smartArea can only be used on textareas");
                return false;
            }

            // Dropdown positioning inspired by
            // https://github.com/component/textarea-caret-position
            // Properties to be copied over from the textarea
            var properties = [
                'direction',  // RTL support
                'boxSizing',
                'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
                'overflowX',
                'overflowY',  // copy the scrollbar for IE
                'color',

                'borderTopWidth',
                'borderRightWidth',
                'borderBottomWidth',
                'borderLeftWidth',

                'borderTopColor',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor',

                'borderTopStyle',
                'borderRightStyle',
                'borderBottomStyle',
                'borderLeftStyle',

                'backgroundColor',

                'paddingTop',
                'paddingRight',
                'paddingBottom',
                'paddingLeft',

                // https://developer.mozilla.org/en-US/docs/Web/CSS/font
                'fontStyle',
                'fontVariant',
                'fontWeight',
                'fontStretch',
                'fontSize',
                'fontSizeAdjust',
                'lineHeight',
                'fontFamily',

                'textAlign',
                'textTransform',
                'textIndent',
                'textDecoration',  // might not make a difference, but better be safe

                'letterSpacing',
                'wordSpacing',
                'whiteSpace',
                'wordBreak',
                'wordWrap'
            ];

            // Build the HTML structure
            var mainWrap = angular.element('<div class="sa-wrapper"></div>'),
                isFirefox = !(window.mozInnerScreenX === null);

            scope.fakeAreaElement = angular.element($compile('<div class="sa-fakeArea" ng-trim="false" ng-bind-html="fakeArea"></div>')(scope))
                .appendTo(mainWrap);

            scope.dropdown.element = angular.element($compile('<div class="sa-dropdown" ng-show="dropdown.content.length > 0"><ul><li ng-repeat="element in dropdown.content"><a href="" ng-click="dropdown.selected()" ng-class="$index == dropdown.current: \'active\'" ng-bind-html="element"></a></li></ul></div>')(scope))
                .appendTo(mainWrap);

            // Default textarea css for the div
            scope.fakeAreaElement.css('whiteSpace', 'pre-wrap');
            scope.fakeAreaElement.css('wordWrap', 'break-word');

            // Transfer the element's properties to the div
            properties.forEach(function (prop) {
                scope.fakeAreaElement.css(prop, textArea.css(prop));
            });

            // Special considerations for Firefox
            if (isFirefox) {
                scope.fakeAreaElement.css('width',parseInt(textArea.width) - 2 + 'px');  // Firefox adds 2 pixels to the padding - https://bugzilla.mozilla.org/show_bug.cgi?id=753662
                // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
                if (textArea.scrollHeight > parseInt(textArea.height)){
                    scope.fakeAreaElement.css('overflowY', 'scroll');
                }
            } else {
                scope.fakeAreaElement.css('overflow', 'hidden');  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
            }

            // Insert the HTML elements
            mainWrap.insertBefore(textArea);
            textArea.appendTo(mainWrap).addClass('sa-realArea').attr('ng-trim',false);
            $compile(textArea);

            // Dirty hack to maintain the height
            textArea.on('keyup', function(){
                scope.fakeAreaElement.height(textArea.height());
            });

            return mainWrap;
        },
        controller: ['$scope', '$element', '$timeout', function($scope, $element, $timeout){
            $scope.fakeArea = $scope.areaData;
            $scope.dropdownContent = 'Dropdown';
            $scope.dropdown = {
                content: [],
                element: null
            };

            $scope.$watch('areaData', function(){
                $scope.trackCaret();
            });

            // Update the text and add the tracking span
            $scope.trackCaret = function(){
                var text = $scope.areaData,
                    position = $element[0].selectionEnd;

                $scope.fakeArea = text.substring(0, position) + '<span class="sa-tracking"></span>' + text.substring(position);

                // Tracking span
                $timeout(function(){
                    var span = $scope.fakeAreaElement.find('span.sa-tracking');
                    if(span.length > 0){
                        var spanOffset = span.position();
                        // Move the dropdown
                        $scope.dropdown.element.css({
                            top: (spanOffset.top + parseInt($element.css('fontSize')))+'px',
                            left: (spanOffset.left)+'px'
                        });
                    }
                    // TODO Track caret on another fake area, so I don't have to recalculate autocomplete triggers every time the cursor moves.
                    highlightText();
                }, 0);
            };

            $element.bind('keyup click focus', function () {
                $timeout(function(){
                    $scope.trackCaret();
                }, 0);
            });

            /* ---- HELPER FUNCTIONS ---- */
            function highlightText(){
                var text = $scope.areaData;
                $scope.areaConfig.autocomplete.forEach(function(autoList){
                    for(var i=0; i<autoList.words.length; i++){
                        //text = text.replace(new RegExp("(?:[^\\w]|\\b)("+autoList.words[i]+")(?:[^\\w]|\\b)", 'g'), autoList.words[i]);
                        text = text.replace(new RegExp("([^\\w]|\\b)("+autoList.words[i]+")([^\\w]|\\b)", 'g'), '$1<span class="'+autoList.cssClass+'">'+autoList.words[i]+'</span>$3');
                    }
                });
                // Add to the fakeArea
                $scope.fakeArea = text;
            }
        }]
    };
});