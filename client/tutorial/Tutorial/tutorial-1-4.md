# Section 1.4
This section will cover JavaScript functions.

## What are functions?
Functions are bits of code that can be reused. Using a function is called "calling" it. Functions are called like this:
```
myFunction("happy", "birthday");
```

The first part `myFunction` is the name of the function. This tells JavaScript what code we want to run. The next part between the brackets `("happy", "birthday")` tells JavaScript to run the code with those arguments. Arguments are variables or values that are used by the function's code. This allows for efficient reuse of code, especially if we have a task that we need to do a lot.

## How do we Write Functions?
There are three main ways to write a function. All three have small differences, however, for the time being we needn't worry about them.

### Example
```
function myFunction1(arg1, arg2) {
  return arg1 + arg2;
}

let myFunction2 = function(arg1, arg2) {
  return arg1 + arg2;
}

let myFunction3 = (arg1, arg2)=>{
  return arg1 + arg2;
}
```

In all three cases the term `myFunction` followed by a number are the names of the functions we are declaring. The values between the brackets are the argument or parameter names for the functions. In this case all three use the same names. Arguments and Parameters are 'passed' to the function when it is called. Arguments and Parameters allow  us to make a function do different things. How you use the arguments is up to you. Using arguments in the function is the same as using a variable of the same name, in fact they are variables, they just have their value assigned when the function is called. The `return` keyword tells JavaScript that this is what we want to give back to the code that ran the function. All three methods create a function with the name given. Here is an example of using a function:

### Example
```
function fahrenToCelsius(degrees){
  return (degrees - 32) * 5/9;
}

console.log(fahrenToCelsius(32)); //Output: 0

console.log(fahrenToCelsius(98)); //Output: 36.66666666667

console.log(fahrenToCelsius(12)); //Output: -11.1111111111

```

In this example we define a function called `fahrenToCelsius` that takes 1 argument `degrees` and returns the equivalent temperature to `degrees` °F in °C. Here is the breakdown:
1. The `function` keyword tells JavaScript to declare a function called `fahrenToCelsius`.
2. The word `degrees` inside the brackets tells JavaScript that the function takes an argument called `degrees`.
3. The keyword `return` tells JavaScript what to give back, in this case it's the result of a calculation that converts °F to °C.
4. The `console.log()` lines tell JavaScript to run the code in the function `fahrenToCelsius` with `degrees` set to `32`, `98`, and `12`, and then to display whatever is returned.

## Try it yourself!
Try to write a function that converts from one unit of measurement to another. The unit is up to you, just remember to return the result. Once you have written you function display the result of calling it at least 4 times with different parameters.

## Up Next
Our next topic is strings and how to manipulate them. Click [here](./tutorial-1-5.md) when you feel comfortable.
