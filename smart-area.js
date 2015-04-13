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

            scope.dropdown.element = angular.element($compile('<div class="sa-dropdown" ng-show="dropdown.content.length > 0"><ul class="dropdown-menu" role="menu" style="position:static"><li ng-repeat="element in dropdown.content" role="presentation"><a href="" role="menuitem" ng-click="dropdown.selected(element)" ng-class="{active: $index == dropdown.current}" ng-bind-html="element.display"></a></li></ul></div>')(scope))
                .appendTo(mainWrap);

            // Default textarea css for the div
            scope.fakeAreaElement.css('whiteSpace', 'pre-wrap');
            scope.fakeAreaElement.css('wordWrap', 'break-word');

            // Transfer the element's properties to the div
            properties.forEach(function (prop) {
                scope.fakeAreaElement.css(prop, textArea.css(prop));
            });

            scope.fakeAreaElement.css('width',(parseInt(textArea.outerWidth()) + 1) + 'px');

            // Special considerations for Firefox
//            if (isFirefox) {
//                scope.fakeAreaElement.css('width',parseInt(textArea.width()) - 2 + 'px');  // Firefox adds 2 pixels to the padding - https://bugzilla.mozilla.org/show_bug.cgi?id=753662
//                // Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
//                if (textArea.scrollHeight > parseInt(textArea.height)){
//                    scope.fakeAreaElement.css('overflowY', 'scroll');
//                }
//            }

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
                element: null,
                current: 0,
                select: null,
                customSelect: null
            };

            $scope.$watch('areaData', function(){
                $scope.trackCaret();

                // TODO Track caret on another fake area, so I don't have to recalculate autocomplete triggers every time the cursor moves.
                checkTriggers();
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
                            top: (spanOffset.top + parseInt($element.css('fontSize')) + 2)+'px',
                            left: (spanOffset.left)+'px'
                        });
                    }
                    highlightText();
                }, 0);
            };

            $element.bind('keyup click focus', function (event) {
                $timeout(function(){
                    $scope.trackCaret();
                }, 0);
            });

            $element.bind('keydown', function(event){
                if($scope.dropdown.content.length > 0) {
                    var code = event.keyCode || event.which;
                    if (code === 13) { // Enter
                        event.preventDefault();
                        event.stopPropagation();
                        // Add the selected word from the Dropdown
                        // to the areaData in the current position
                        $scope.dropdown.selected($scope.dropdown.content[$scope.dropdown.current]);
                    }else if(code === 38){ // Up
                        event.preventDefault();
                        event.stopPropagation();
                        $scope.dropdown.current--;
                        if($scope.dropdown.current < 0){
                            $scope.dropdown.current = $scope.dropdown.content.length - 1; // Wrap around
                        }
                    }else if(code === 40){ // Down
                        event.preventDefault();
                        event.stopPropagation();
                        $scope.dropdown.current++;
                        if($scope.dropdown.current >= $scope.dropdown.content.length){
                            $scope.dropdown.current = 0; // Wrap around
                        }
                    }else if(code === 27){ // Esc
                        event.preventDefault();
                        event.stopPropagation();
                        $scope.dropdown.content = [];
                    }
                }
            });

            $scope.dropdown.selected = function(item){
                if($scope.dropdown.customSelect !== null){
                    addSelectedDropdownText($scope.dropdown.customSelect(item), true);
                }else{
                    addSelectedDropdownText(item.display);
                }
                $scope.dropdown.content = [];
            };

            function addSelectedDropdownText(selectedWord, append){
                var text = $scope.areaData,
                    position = $element[0].selectionEnd,
                    lastWord = text.substr(0, position).split(/[\s\b{}]/),
                    remove = lastWord[lastWord.length - 1].length;

                if(append || remove < 0){
                    remove = 0;
                }

                // Now remove the last word, and replace with the dropped down one
                $scope.areaData = text.substr(0, position - remove) +
                    selectedWord +
                    text.substr(position);

                // Now reset the caret position
                if($element[0].selectionStart) {
                    $timeout(function(){
                        $element[0].setSelectionRange(position - remove + selectedWord.length, position - remove + selectedWord.length);
                        checkTriggers();
                    }, 100);
                }

            }

            /* ---- HELPER FUNCTIONS ---- */
            function highlightText(){
                var text = $scope.areaData;

                $scope.areaConfig.autocomplete.forEach(function(autoList){
                    for(var i=0; i<autoList.words.length; i++){
                        if(typeof(autoList.words[i]) === "string"){
                            text = text.replace(new RegExp("([^\\w]|\\b)("+autoList.words[i]+")([^\\w]|\\b)", 'g'), '$1<span class="'+autoList.cssClass+'">$2</span>$3');
                        }else{
                            text = text.replace(autoList.words[i], function(match){
                                return '<span class="'+autoList.cssClass+'">'+match+'</span>';
                            });
                        }
                    }
                });
                // Add to the fakeArea
                $scope.fakeArea = text;
            }

            function checkTriggers(){
                triggerDropdownAutocomplete();
                triggerDropdownAdvanced();
            }

            function triggerDropdownAdvanced(){
                $scope.areaConfig.dropdown.forEach(function(element){
                    // Check if the trigger is under the cursor
                    var text = $scope.areaData,
                        position = $element[0].selectionEnd;
                    if(typeof(element.trigger) === 'string' && element.trigger === text.substr(position - element.trigger.length, element.trigger.length)){
                        // The cursor is exactly at the end of the trigger
                        $scope.dropdown.content = element.list();
                        $scope.dropdown.customSelect = element.onSelect;
                    }else if(typeof(element.trigger) === 'object'){
                        // I need to get the index of the last match
                        var searchable = text.substr(0, position),
                            match, found = false, lastPosition = 0;
                        while ((match = element.trigger.exec(searchable)) !== null){
                            if(match.index === lastPosition){
                                break;
                            }
                            lastPosition = match.index;
                            if(match.index + match[0].length === position){
                                found = true;
                                break;
                            }
                        }
                        if(found){
                            $scope.dropdown.content = element.list(match);
                            $scope.dropdown.customSelect = element.onSelect;
                        }
                    }
                });
            }

            function triggerDropdownAutocomplete(){
                // First check with the autocomplete words (the ones that are not objects
                var autocomplete = [],
                    suggestions = [],
                    text = $scope.areaData,
                    position = $element[0].selectionEnd,
                    lastWord = text.substr(0, position).split(/[\s\b{}]/);

                // Get the last typed word
                lastWord = lastWord[lastWord.length-1];

                $scope.areaConfig.autocomplete.forEach(function(autoList){
                    autoList.words.forEach(function(word){
                        if(typeof(word) === 'string' && autocomplete.indexOf(word) < 0){
                            if(lastWord.length > 0 || lastWord.length < 1 && autoList.autocompleteOnSpace){
                                autocomplete.push(word);
                            }
                        }
                    });
                });

                $scope.areaConfig.dropdown.forEach(function(element){
                    if(typeof(element.trigger) === 'string' && autocomplete.indexOf(element.trigger) < 0){
                        autocomplete.push(element.trigger);
                    }
                });

                // Now with the list, filter and return
                autocomplete.forEach(function(word){
                    if(lastWord.length < word.length && word.toLowerCase().substr(0, lastWord.length) === lastWord.toLowerCase()){
                        suggestions.push({
                            display: word,
                            data: null
                        });
                    }
                });

                $scope.dropdown.customSelect = null;
                $scope.dropdown.current = 0;
                $scope.dropdown.content = suggestions;
            }
        }]
    };
});
