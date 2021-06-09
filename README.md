# interpreter
This is an interpreter for a language that is functional, inferred and strongly typed. It is under active development and a bit buggy. Currently it supports varibles, flow-control and subroutines. I plan to expand it to include additional features like classes, builtin functions, complex data types, etc.

## features
- variables with optional types
- while loops
- until loops
- conditional statements
- subroutines
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
Note: comments are a bit buggy   

varibles are declared with the ```let``` keyword
``` 
let variable = 23  
```
The variables type will be inferred by the interpreter. However, types can also optionally be explicitly stated. 
```
let num : real
let greeting : string = "howdy"
```
An error (should) be thrown if you try to assign a value to a different type. For example ``let num : real = "error"``. 

there are four primative types: ```integer```, ```float```, ```boolean``` and ```string```
```
let num = 45
let percent = 0.99
let interesting = false
let name = "Steve"
```
the types for each varible (should) be infered and should throw errors if you try to operate on different types.

supports basic math (``+, -, *, /, %``) and operator precedence
```
let math = 1 + 2 - 3 * 4 / 5 % 6 * (3 - 2) // 0.6
```

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
