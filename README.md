![smart-area](https://raw.githubusercontent.com/aurbano/smart-area/master/assets/logo.png)
=

> Textareas on Steroids - just adding an AngularJS directive

## Features

* Word highlighting (syntax, keywords... ) with support for multiple sets
* Autocomplete
* Dropdown suggestions (mention users after typing @, hashtag support, keywords... )
* Minimal configuration required, but highly customizable if necessary

## Getting started

Get a copy of `smart-area` either by [Downloading the files](https://github.com/aurbano/smart-area/archive/master.zip), or using a package manager:

```sh
bower install --save smart-area
```

```sh
npm install --save smart-area
```

*It requires jQuery to function properly at the moment, I'll try to make it depend only on jqLite so it works on vanilla Angularjs.*

To setup smartArea on an element simply add the attribute:

```html
<textarea
  name="sampleTextarea"
  id="sampleTextarea"
  class="form-control code"
  ng-model="myModel"
  ng-trim="false"
  spellcheck="false"

  smart-area="areaConfig">
</textarea>
```

### Examples

All of these examples use the same HTML markup, only the configuration changes.

#### User mentions

[Test in Plunkr](http://embed.plnkr.co/tu74kf/)

```js
$scope.areaConfig = {
  dropdown: [{
      // trigger can be a string or a regexp
      // in this case this regexp should match Twitter-style @mentions
      trigger: /@([A-Za-z]+[_A-Za-z0-9]+)/gi,
      // The list() function gets called when the trigger matches
      // it should return a list of elements to be suggested
      list: function(match, callback){
        // match is the regexp return, in this case it returns
        // [0] the full match, [1] the first capture group => username
        $http.get('/fakeApi/users', {
          user: match[1]
        }).success(function(data){
          // Prepare the fake data
          var listData = data.map(function(element){
            return {
              display: element.userName, // This gets displayed in the dropdown
              item: element // This will get passed to onSelect
            };
          });
          callback(listData);
        }).error(function(err){
          console.error(err);
        });
      },
      // Function that gets called when an item is selected
      // it's return value gets added to the textarea
      onSelect: function(item){
        return item.userName;
      },
      // mode can be append or replace
      // here we want replace because the user has already typed
      // part of the username
      mode: 'replace'
    }
  ]
};
```

----

#### Syntax highlighter and autocompleter for a SQL editing textarea

```js
$scope.areaConfig = {
  autocomplete: [{
      words: ['SELECT', 'UPDATE', 'DELETE', 'INSERT'],
      cssClass: 'highlight sqlMain',
      autocompleteOnSpace: true
    },
    {
      words: ['WHERE', 'FROM', 'ORDER BY', 'LIMIT', 'JOIN'],
      cssClass: 'highlight sqlQuery',
      autocompleteOnSpace: true
    },
    {
      words: ['users','messages','friends','events'],
      cssClass: 'highlight tables'
    }
  ]
};
```

`autocompleteOnSpace` sets the trigger to run even when the user hasn't started typing, so that it already suggests commands. It defaults to `false`, which could be useful for other words, in the example the table names.

## API
The configuration options are mostly optional and have sensible defaults:

### `autocomplete`

You can specify here sets of words that will be available on autocomplete. `autocomplete` expects an array of objects, each being a different autocomplete rule:

```js
$scope.areaConfig = {
  autocomplete: [{
      words: [string | RegExp],
      cssClass: string,
      autocompleteOnSpace: boolean
    }
  ]
};
```

* `words` is required, it must be an array of either `strings` or `RegExp` objects. If they are strings they will be available on the autocomplete dropdown, if they are regular expressions they will only be used to apply CSS classes.
* `cssClass` is an optional string with classes that will be set on the elements, you can think of it as syntax highlighting.
* `autocompleteOnSpace` defaults to `false`, it determines whether the words on the list will be suggested before the user begins typing a word.

### `dropdown`
This element is a lot more powerful than the autocomplete, it's essentially the same concept, but with custom trigger, list function, and selection functions.

```js
$scope.areaConfig = {
  dropdown: [{
      trigger: string | RegExp
      list: function(match, callback){} | function(callback){},
      onSelect: function(item){},
      filter: boolean,
      mode: 'replace' | 'append'
    }
  ]
};
```

* `trigger`: This can be either a `string` or a `RegExp`. In either case, smarArea will call the list function when the user places the cursor after it.
* `list`: This function gets called as soon as the trigger is found. If the trigger is a `string`, the only parameter will be (`callback`). If the trigger is a `RexExp` you'll get (`match`, `callback`), where `match` is the result of the regular expression. In both cases you must execute the callback with one parameter:
  * `list()` should not return anything, use the callback instead (This brings async support).
  * The data to be used by the list will be passed to callback (See the examples)
  * The format of that data is: `[{display: string, data: Object}, ...]`
  * `data` is an Object where you can pass information to the `onSelect` event.
* `onSelect`: This function gets called when an element is selected from the dropdown. I receives the selected object that you returned on the `list()` function (So inside `onSelect` you can access `item.data` for you custom properties).
* `filter`: Defaults to `false`, if set to `true` it will add a filtering field to the dropdown.
* `mode`: Either `replace` or `append`. Use `replace` when you want to complete something the user is typing (i.e. user mentions). Use `append` when you suggest something that goes after the trigger, without removing the trigger.

## CSS
The directive doesn't force any styles on the dropdown or textareas so that you can fully integrate it with your design. I would recommend using the stylesheet from the repo, and then modifiying to suit your needs.

### Dropdown element
This is the only visible element created by the directive, `smart-area` doesn't include any styling, it only has some layouting CSS.
The dropdown is generated with the following markup:

```html
<div class="sa-dropdown">
  <input type="text" class="form-control"/>
  <ul class="dropdown-menu" role="menu" style="position:static">
    <li ng-repeat="element in dropdown.content | filter:dropdown.filter" role="presentation">
      <a href="" role="menuitem"></a>
    </li>
  </ul>
</div>
```

As you can see, it uses `bootstrap` CSS classes, so if you site uses it you'll be all set.
Otherwise, create CSS styles for:

* `input.form-control`
* `ul.dropdown-menu` (and children)
* `ul.dropdown-menu a.active`

## Extras

### Autogrow
If you want to have the textarea autogrow as user types I recommend using `smart-area` coupled with another directive. I'm using [angular-elastic](https://github.com/monospaced/angular-elastic) on a project and it works nicely with it:

> [Plunkr demo](http://plnkr.co/edit/ABGPRIshuDk3mDcNgZzg)

```html
<textarea
  name="sampleTextarea"
  id="sampleTextarea"
  class="form-control code"
  ng-model="myModel"
  ng-trim="false"
  spellcheck="false"
  
  msd-elastic // Directive for autogrowing text areas

  smart-area="areaConfig">
</textarea>
```

-----------
*By [Alejandro U. Alvarez](http://urbanoalvarez.es) - AGPLv3 License*

[![Analytics](https://ga-beacon.appspot.com/UA-3181088-16/smart-area/readme)](https://github.com/aurbano)
