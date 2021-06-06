# interpreter
A small, fairly useless interpreter that uses type inference. A work in progress. It currently supports very few features (math, varibles, flow control). It is also buggy and may have many, umm, 'undocumented' features. I do of course have many great plans for this pathetic language (which doesn't even have a name), like functions, scopes, classes and a whole bunch of other cool stuff. 

## features
- while loops
- until loops
- conditional statements
- stdout

## run
Clone this repo and navigate to the home directory. To interprete a file run ``node src/index.js <name-of-file>``. Run ``node src/index.js --h`` for a list of optional flags. 

## examples
A hello world example (classic)
```
print "Hello, World!"
```
for comments use ```//``` for single lines and ```/* */``` for multilines  
```
// single line comments
/* multiline
 comment */
```
Note: multiline comments are a bit buggy   

varibles are declared with the ```let``` keyword
``` 
let varible = 23  
```

supports basic math (``+, -, *, /, %``) and operator precedence
```
let math = 1 + 2 - 3 * 4 / 5 % 6 * (3 - 2) // 0.6
```

there are four primative types: ```integer```, ```float```, ```boolean``` and ```string```
```
let num = 45
let percent = 0.99
let interesting = false
let name = "Steve"
```
the types for each varible (should) be infered and should throw errors if you try to operate on different types.

``while`` loops
```
while (condition) repeat
  // do something
endwhile
```

``until`` loops
```
until (condition) repeat
  // do something
enduntil
```
conditional ``if`` statement
```
if (condition) then
  // do something
else 
  // optional else block
endif
```
