# Section 1.2
In this section we will cover the most basic method of output, `console.log()` and how JavaScript handles numbers and maths.

## Hello World!
Over the years of programming programmers have adopted a ritual like introduction to learning a new language. This convention is known as **Hello World!**. In it's most basic form the aim is to display the text `Hello World!` onto the screen.

In JavaScript this is done using something known as `console.log()`.
### Example
```
console.log("Hello World!");
```

Some key things to note:
1. The text we want to show must be inside quotes. It doesn't matter whether they are double quotes `"` or single quotes `'` just as long as you don't use different ones. e.g. `console.log("Hello World!')` or `console.log('Hello World!")`. Neither of these will work and most often will cause errors.
2. `console.log` must be lowercase. JavaScript is what is known as case-sensitive, meaning if something is in uppercase you must use uppercase and something in lowercase must use lowercase.


## Escaping
If you want to show a `'` or a `"` in your text make sure to either put them inside a different quote e.g. `"Use this to display a ' character"` or `'this to display a " character'`, or if you want to use both, ensure to 'escape' them. Escape means to tell JavaScript to treat the next character as something special. This is done by adding a backslash (`\`) character in front of the character. If you want to use a `\` character in your text without escaping the next character add another `\` in front of it.

### Example
```
console.log("Here\'s how to use both \' and \" in a string together");// Output: Here's how to use both ' and " in a string together
console.log("Here's how to display a \\ character");// Output: Here's how to display a \ character
```

## Try it Yourself!
Open a new spell and try changing the text in the quotes. See what you can display.

## Maths and Numbers
JavaScript can do maths just like we can, only a lot faster. JavaScript understands the basic operators like `+`, `-`, `*` and `/` just like we have in everyday maths.  
Here is a list of operators and what they do.

| Operator | Name | Purpose |
| -------- | ---- | ------- |
| + | plus or addition | The addition operator adds two numbers together |
| - | minus or subtraction | The subtraction operator subtracts two numbers |
| &#42; | multiplication | The multiplication operator multiplies two numbers together |
| / | division | The division operator divides one number by another |
| &#42;&#42; | exponentiation | The exponentiation operator raises a number to the power of another much like 2^(3)^ |

A side note: the numbers around an operator are known as operands. e.g. in `3 + 4`, `+` is the operator and `3`, and `4` are the operands.

### Example
```
console.log(4 + 5);
console.log(4326483 * 2947384);
console.log(24 - 12);
console.log(15 / 3);
```

You'll notice that the equations are not in quotes. This tells JavaScript to calculate the answer instead of showing us the equation.
```
console.log("4 + 5"); //outputs: 4 + 5
console.log(4 + 5); //outputs: 9
```

Those double forward slashes `//` means the JavaScript won't run anything past that for the rest of the line. These are known as comments, they are entirely for the coders.
```

console.log("This will run!");

//console.log("This won't run!");

```

Comments are useful for marking what does what, and also temporarily removing code, as JavaScript will not run it. We recommend commenting most of your code as remembering what does what can become quite difficult.

### Your Turn!

Try outputting the result of a large calculation. JavaScript is fast. Very fast. See what you can get it to do.

## Brackets inside brackets inside brackets...
JavaScript also understands BIMDAS or Brackets, Indices, Multiplication, Division, Addition, Subtraction. In programming this is known as precedence, or the order things are executed in. Below is a breakdown of how the equation `6 * (2 + 3) / 15 - 9` is calculated:

First the brackets are calculated:  
`6 * (2 + 3) / 15 - 9`  
`6 * 5 / 15 - 9`  
Then multiplication and division going left to right:  
`6 * 5 / 15 - 9`  
`30 / 15 - 9`  
And again:  
`30 / 15 - 9`  
`2 - 9`  
And finally addition and subtraction going left to right:  
`2 - 9`  
`-7`

### Give it a try!
You may have seen a viral maths problem going around. It looks something like this: `6 / 2 * (1 + 2) = ?`. What do you think it equals. After you've figured it out make JavaScript do it and see what the correct answer is. It may surprise you.

## Next up
Next we'll move on to variables. If you feel comfortable with this section click [here](./tutorial-1-3.md) to move on.
