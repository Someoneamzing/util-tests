# Section 1.3
In this section we will go over the concept of variables.

## Remember me
Doing maths and displaying text is all well and good but so far JavaScript seems like a fancy calculator. It doesn't even have some of the features of the standard school calculators. This is where variables come in. Variables in their simplest form allow JavaScript to remember things between lines of code. The basic idea is we give a value a name. That value can be a piece of text or a number, even the result of a calculation. The name we give it is up to us, usually something meaningful, so we know what it stores. Creating one of these variables is known as declaring a variable. It is done like so: `let myVar = 25;`.  
The word `let` tells JavaScript that the next word is the name we are declaring. The equals sign (`=`), tells JavaScript that the next thing is the value we want to store, in this case `25`.

Variables can also store text or strings as they are known as in programming, named so as they are 'strings' of characters. Let's see what that looks like:  
`let myName = "Jacob McEwan";`. Here we have declared the variable `myName` and assigned the value `"Jacob McEwan"` to it. Assigned is another fancy way of saying set.

**But what can we do with variables?** Well, quite a lot. Remember `console.log()`? Well in our first example we showed you how to display text on to the screen. Well `console.log()` can also display the value of variables. E.g.
```
let myVar = "This is myVar talking!";
console.log(myVar);
//Output: This is myVar talking!
```

Note, JavaScript remembered what myVar meant so it printed out what it stored. Also we didn't use quotes around myVar in `console.log()`. This is because we didn't want JavaScript to display `myVar` we wanted it to display what `myVar` stored.

**But this still isn't anything interesting. So far it's making my code longer! What gives?** This is the beauty of programming. Remember the operators from the last section? There are some more, specifically designed for working with variables. Those operators are:

| Operator | Name | Purpose |
| -------- | ---- | ------- |
| += | Increment by | This operator adds the right number to the value of the left variable and stores the result in that variable. |
| -= | Decrement by | This operator subtracts the right number from the value of the left variable and stores the result in that variable. |
| *= | Multiply and store | This operator multiplies the right number by the value of the left variable and stores the result in that variable. |
| /= | Divide and store | This operator divides the value of the left variable by the right number and stores the result in the left variable. |

## Example
```
let myNum = 3;
console.log("myNum before +=:");
console.log(myNum); //Output: 3
myNum += 4;
console.log("myNum after +=:");
console.log(myNum); //Output: 7

console.log("myNum before -=:");
console.log(myNum); //Output: 7
myNum -= 2;
console.log("myNum after -=:");
console.log(myNum); //Output: 5

console.log("myNum before &#42;=:");
console.log(myNum); //Output: 5
myNum &#42;= 5;
console.log("myNum after &#42;=:");
console.log(myNum); //Output: 25

console.log("myNum before /=:");
console.log(myNum); //Output: 25
myNum /= 2;
console.log("myNum after /=:");
console.log(myNum); //Output: 12.5
```

As you can see the above operators perform their calculation and then store the result in the variable. This allows for cumulative calculations. Another way of doing this is like so:
```
let myNum = 25;
console.log("myNum before:");
console.log(myNum); //Output: 25
myNum = myNum + 2;
console.log("myNum after:");
console.log(myNum); //Output: 27
```

This works because JavaScript calculates the variable using the original value before storing it. Essentially JavaScript substituted the value of `myNum` in before it performed the calculation:  
`myNum = myNum + 2;`  
`myNum = 25 + 2;`  
`myNum = 27;`  

This means the operators above are what are known as shorthand. They perform the same operation so `myNum += 2;` is the same as `myNum = myNum + 2;`.

## Your Turn!
Try to come up with a large calculation and use the shorthand operators. Get a feel as to how they work and see where they break. Maybe try running it with another variable on the right-hand side or a number on the left. What happens?

## Up Next
The next section will cover functions in JavaScript. Get familiar with the concept of variables and then click [here](./tutorial-1-4.md) to move on.
